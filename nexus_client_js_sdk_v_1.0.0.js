/*!
 * Nexus JS SDK v1.0.0
 * Context-Aware Abuse Protection Client
 *
 * Author: Digitobit
 * Developed By: Neeraj Mourya
 * Product: Nexus
 *
 * Copyright (c) 2026 Digitobit
 *
 * Licensed under the MIT License.
 * You may use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of this software, subject to the conditions below.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 *
 * In no event shall the authors or copyright holders be liable for any claim,
 * damages or other liability, whether in an action of contract, tort or otherwise,
 * arising from, out of or in connection with the software.
 *
 * ------------------------------------------------------------
 * Build Information
 * ------------------------------------------------------------
 * Version: 1.0.0
 * Release Date: 2026-04-25
 * Developed by: Neeraj Mourya
 *
 * Website: https://www.digitobit.com
 * GitHub: https://github.com/Digitobit-Labs/nexus-client-js-sdk
 *
 * ------------------------------------------------------------
 * Notes
 * ------------------------------------------------------------
 * - This SDK communicates with Nexus Guard API.
 * - Unauthorized modification of verification logic may reduce protection.
 * - Commercial usage is permitted under MIT License.
 * - This SDK is open-source, but Nexus backend services are proprietary.
 * - API usage may be subject to service terms and rate limits.
 */

(function (window, document) {

'use strict';

const VERSION = "1.0.0";

/* ============================================================
   Utilities
============================================================ */

const Utils = {

    now(){
        return Math.floor(Date.now()/1000);
    },

    perf(){
        return performance.now();
    },

    rid(){
        return "r_" + Math.random().toString(36).substring(2,10);
    },

    nonce(){
        const arr = new Uint32Array(2);
        crypto.getRandomValues(arr);
        return "c_" + arr[0].toString(36) + arr[1].toString(36);
    },

    async hash(str){
        try{
            // return "fp_" + btoa(str).substring(0,16);
            return await Utils.sha256(str);
        }catch(e){
            return "fp_fallback";
        }
    },

    async sha256(str){
        const encoder = new TextEncoder();
        const data = encoder.encode(str);

        const hashBuffer = await crypto.subtle.digest('SHA-256', data);

        const hashArray = Array.from(new Uint8Array(hashBuffer));

        return hashArray
            .map(b => b.toString(16).padStart(2,'0'))
            .join('');
    },

    async post(url,data){

        const res = await fetch(url,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(data)
        });

        return res.json();
    }
};

/* ============================================================
   Signal Collector
============================================================ */

class SignalCollector{

    constructor(){

        this.initTime = Utils.perf();
        this.clientNonce = Utils.nonce();

        /* interaction signals */
        this.events = 0;
        this.keystrokes = 0;
        this.backspaces = 0;

        this.pasteUsed = false;
        this.focusChanges = 0;
        this.visibilityChanges = 0;
        this.blurCount = 0;

        this.firstInteraction = null;

        /* automation signals */
        this.eventLoopLag = 0;

        /* mouse entropy */
        this.mouseMoves = 0;
        this.mouseDistance = 0;
        this.directionChanges = 0;

        this.lastX = null;
        this.lastY = null;
        this.lastDirection = null;

        /* interaction latency fingerprinting */
        this.firstTrustedEventTime = null;
        this.syntheticEvents = 0;
        this.trustedEvents = 0;

        this.bind();
        this.probeEventLoop();
    }


    /* ============================================================
    Event Loop Lag Probe
    ============================================================ */

    probeEventLoop(){

        const start = Utils.perf();

        setTimeout(()=>{

            const lag = Utils.perf() - start;

            this.eventLoopLag = Math.round(lag);

        },0);
    }


    /* ============================================================
    Event Binding
    ============================================================ */

    bind(){
        let last = 0;
        document.addEventListener('mousemove',(e)=>{
            const now = performance.now();
            if(now - last < 50) return;
            last = now;
            
            this.mouseMoves++;

            if(this.lastX !== null){

                const dx = e.clientX - this.lastX;
                const dy = e.clientY - this.lastY;

                const dist = Math.sqrt(dx*dx + dy*dy);

                this.mouseDistance += dist;

                const dir = Math.atan2(dy,dx);

                if(this.lastDirection !== null){

                    if(Math.abs(dir - this.lastDirection) > 0.5)
                        this.directionChanges++;
                }

                this.lastDirection = dir;
            }

            this.lastX = e.clientX;
            this.lastY = e.clientY;

            this.trackEvent(e);

        });


        document.addEventListener('click',(e)=>{
            this.interact();
            this.trackEvent(e);
        });


        document.addEventListener('keydown',(e)=>{

            this.keystrokes++;

            if(e.key==='Backspace')
                this.backspaces++;

            this.interact();

            this.trackEvent(e);

        });


        document.addEventListener('paste',()=>{
            this.pasteUsed = true;
        });


        window.addEventListener('focus',()=>this.focusChanges++);
        window.addEventListener('blur',()=>this.blurCount++);


        document.addEventListener('visibilitychange',()=>{
            this.visibilityChanges++;
        });

    }


    /* ============================================================
    Interaction Tracking
    ============================================================ */

    interact(){

        this.events++;

        if(!this.firstInteraction)
            this.firstInteraction = Utils.perf();
    }


    /* ============================================================
    Latency + Trusted Event Detection
    ============================================================ */

    trackEvent(e){

        if(e.isTrusted){

            this.trustedEvents++;

            if(!this.firstTrustedEventTime)
                this.firstTrustedEventTime = Utils.perf();

        }else{

            this.syntheticEvents++;

        }

    }


    /* ============================================================
    Fingerprint
    ============================================================ */

    async fingerprint(){
        
        return await Utils.hash([
            navigator.userAgent,
            screen.width,
            screen.height,
            navigator.language
        ].join('|'));
    }

    /* ============================================================
    Attestation Builder
    ============================================================ */
    async buildAttestation(rid, action, siteKey, fingerprint, pageLoadMs){

        const sdkInit = Math.round(this.initTime);

        const payload = [
            siteKey,
            action,
            rid,
            this.clientNonce,
            fingerprint,
            pageLoadMs,
            sdkInit
        ].join('|');

        return Utils.sha256(payload);
    }


    /* ============================================================
    Payload Builder
    ============================================================ */

    async payload(action,siteKey){

        const now = Utils.perf();

        const rid = Utils.rid();

        const fingerprint = await this.fingerprint();

        const pageLoadMs = Math.round(now - this.initTime);

        const attestation = await this.buildAttestation(
            rid,
            action,
            siteKey,
            fingerprint,
            pageLoadMs
        );

        return {

            api_key: siteKey,
            action,

            rid: rid,
            client_nonce: this.clientNonce,

            fingerprint: fingerprint,
            ts: Utils.now(),

            context:{
                path:location.pathname,
                method:"POST",
                referrer:document.referrer,
                ua:navigator.userAgent
            },

            exec:{
                webdriver:navigator.webdriver || false,
                languages:navigator.languages || [],
                plugins_count:navigator.plugins?.length || 0,
                mime_types_count:navigator.mimeTypes?.length || 0,
                permissions:{
                    notifications: window.Notification ? Notification.permission : "default"
                }
            },

            timing:{
                page_load_ms:pageLoadMs,
                time_on_page_ms:Math.round(now - this.initTime),
                first_interaction_ms:this.firstInteraction
                    ? Math.round(this.firstInteraction - this.initTime)
                    : null,
                trusted_event_latency_ms:this.firstTrustedEventTime
                    ? Math.round(this.firstTrustedEventTime - this.initTime)
                    : null,
                event_count:this.events,
                event_loop_lag_ms:this.eventLoopLag
            },

            input:{
                keystroke_count:this.keystrokes,
                paste_used:this.pasteUsed,
                backspace_ratio:this.keystrokes
                    ? parseFloat((this.backspaces/this.keystrokes).toFixed(2))
                    : 0,
                focus_changes:this.focusChanges
            },

            behavior:{
                mouse_moves:this.mouseMoves,
                mouse_distance:Math.round(this.mouseDistance),
                mouse_direction_changes:this.directionChanges,
                trusted_events:this.trustedEvents,
                synthetic_events:this.syntheticEvents
            },

            visibility:{
                tab_visible:document.visibilityState==='visible',
                visibility_changes:this.visibilityChanges,
                blur_count:this.blurCount
            },

            env:{
                timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
                screen:`${screen.width}x${screen.height}x${screen.colorDepth}`,
                device_memory:navigator.deviceMemory || null,
                hardware_concurrency:navigator.hardwareConcurrency || null
            },

            sdk:{
                version:VERSION,
                integrity:"ok",
                init_ms:Math.round(this.initTime),
                attestation
            }
        };
    }
}


/* ============================================================
   Challenge Renderer
============================================================ */

const Challenge = {

    render(container,challenge,callback){

        if(!container)
            container = this.overlay();

        container.innerHTML = "";

        switch(challenge.type){

            case "delay":
                this.delay(container,challenge,callback);
                break;

            case "image":
                this.image(container,challenge,callback);
                break;

            case "sequence_memory":
            case "arithmetic":
            case "emoji_count":
            case "reverse_text":
            case "pick_color":
                this.simpleInput(container,challenge,callback);
                break;

            default:
                container.innerHTML = "<p>Unknown challenge.</p>";
        }
    },


/* ------------------------------------------------------------
   Delay Challenge
------------------------------------------------------------ */

    delay(container,challenge,callback){

        container.innerHTML = `
            <div class="nexus-box">
                <label style="cursor:pointer">
                    <input type="checkbox" class="nexus-check">
                    I am not a bot.
                </label>
            </div>
        `;

        const checkbox = container.querySelector('.nexus-check');

        checkbox.addEventListener('change',()=>{

            container.innerHTML = `
                <div class="nexus-box">
                    <p>Verifying...</p>
                </div>
            `;

            callback(null);
        });
    },


/* ------------------------------------------------------------
   Image Challenge
------------------------------------------------------------ */

    image(container,challenge){

        const p = challenge.payload;

        container.innerHTML = `
            <div class="nexus-box">
                <p>${p.question}</p>
                <img src="${p.image_base64}" style="max-width:100%;margin:10px 0">
                <input class="nexus-answer" placeholder="Enter text">
            </div>
        `;
    },


/* ------------------------------------------------------------
   Text Input Challenges
------------------------------------------------------------ */

    simpleInput(container,challenge){

        const p = challenge.payload;
        let qPart = "";
        
        switch(challenge.type){
            case "emoji_count":
                qPart = `<br>${p.sequence}`;
                break;
            case "pick_color":
                qPart = `<span style='display:inline-block; width:30px; height:30px; background-color:${p.color}'>
                            &nbsp;
                        </span>`;
                break;
        }

        container.innerHTML = `
            <div class="nexus-box">
                <p>${p.question} ${qPart}</p>
                <input class="nexus-answer" placeholder="Enter answer">
            </div>
        `;

        const input = container.querySelector('.nexus-answer');

        let timer = null;

        input.addEventListener('input',()=>{

            clearTimeout(timer);

            timer = setTimeout(()=>{

                const form = input.closest('form');

                if(form){
                    form.requestSubmit();
                }

            },1500);

        });
    },


    overlay(){

        const o = document.createElement('div');

        o.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.7);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;`;

        document.body.appendChild(o);

        return o;
    }
};

/* ============================================================
   Core Nexus
============================================================ */

const Nexus = {

    config:{
        siteKey:null,
        endpoint:'http://localhost/nexus/public/v1/guard/token',
        auto:false,
        guard:null
    },

    collector:new SignalCollector(),


    init(){
        const script = document.querySelector('script[src*="nexus_sdk"]');

        if(!script){
            console.error("Nexus SDK script tag not found");
            return;
        }

        this.config.siteKey = script.dataset.sitekey;
        this.config.auto = script.dataset.auto === "form";
        this.config.guard = script.dataset.guard || null;
        
        console.log(this.config.siteKey);

        if(!this.config.siteKey){
            console.error("Nexus sitekey missing");
            return;
        }

        if(this.config.auto)
            this.bindForms();

        if(this.config.guard)
            this.guardPage();
    },


    async execute(action,extra={}){

        const payload = await this.collector.payload(action,this.config.siteKey);
        console.log(payload);
        Object.assign(payload,extra);

        return Utils.post(this.config.endpoint,payload);
    },


/* ============================================================
   FORM MODE
============================================================ */

    bindForms(){

        document.addEventListener('submit', async (e)=>{

            const form = e.target;

            if(!form.matches('[data-nexus-action]'))
                return;

            e.preventDefault();
            e.stopPropagation();

            const action = form.dataset.nexusAction;

            const container = this.ensurePlaceholder(form);

            const input = container.querySelector('.nexus-answer');

            /* --------------------------------------------------
               If challenge input already exists → submit answer
            -------------------------------------------------- */

            const challengeId = form.dataset.nexusChallengeId || null;

            if(input){

                const answer = input.value.trim();

                container.innerHTML = "<p>Verifying...</p>";

                await this.process(action,form,container,{
                    challenge_id: challengeId,
                    challenge_response:{
                        answer
                    }
                });

                return;
            }

            /* --------------------------------------------------
               Otherwise run initial protection request
            -------------------------------------------------- */

            await this.process(action,form,container);

        });

    },


    ensurePlaceholder(form){

        let container = form.querySelector('.nexus-challenge');

        if(container)
            return container;

        container = document.createElement('div');

        container.className = "nexus-challenge";

        const btn = form.querySelector('button[type="submit"],input[type="submit"]');

        if(btn)
            btn.parentNode.insertBefore(container,btn);
        else
            form.appendChild(container);

        return container;
    },


/* ============================================================
   PAGE GUARD
============================================================ */

    async guardPage(){

        const container = this.ensurePagePlaceholder();

        this.process(this.config.guard,null,container);
    },


    ensurePagePlaceholder(){

        let c = document.querySelector('.nexus-challenge');

        if(!c){

            c = document.createElement('div');

            c.className = 'nexus-challenge';

            document.body.prepend(c);
        }

        return c;
    },


/* ============================================================
   PROCESS RESPONSE
============================================================ */

    async process(action,form=null,container=null,extra={}){

        const res = await this.execute(action,extra);
        
        console.log(res);

        if(res.status === "ok"){

            if(form){
                delete form.dataset.nexusChallengeId;
                this.injectToken(form,res.token);
                //form.submit();
            }

            return;
        }

        if(res.status === "challenge"){

            if(!container && form)
                container = form.querySelector('.nexus-challenge');

            form.dataset.nexusChallengeId = res.challenge_id;

            Challenge.render(container,res,(answer)=>{

                this.process(action,form,container,{
                    challenge_id: res.challenge_id,
                    challenge_response:{
                        answer
                    }
                });

            });

            return;
        }

        if(res.status === "denied"){

            if(container)
                container.innerHTML = "<p>Access denied</p>";
        }
    },


    injectToken(form,token){

        let input = form.querySelector('[name="nexus_token"]');

        if(!input){

            input = document.createElement('input');

            input.type = "hidden";
            input.name = "nexus_token";

            form.appendChild(input);
        }

        input.value = token;
    }
};


window.Nexus = Nexus;


/* ============================================================
   Auto Init
============================================================ */

document.addEventListener("DOMContentLoaded",()=>{

    Nexus.init();

});


})(window,document);
