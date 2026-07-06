let get = (item) => {return document.getElementById(item);}

let body = document.querySelector("body");

function getVar(varname) {
    return getComputedStyle(document.documentElement).getPropertyValue(varname).trim();
}

function asyncLoop(condition, callback, timeout) {
    return new Promise((resolve) => {
        let loop = () => {
            setTimeout(async () => {
                if (await condition()) {
                    await callback()
                    loop()
                }
                else {
                    resolve(true);
                }
            }, timeout);
        };
        loop();
    });
}

let audioSources = {
    "ripsound": get("ripsound"),
    "checkout": get("checkout"),
    "clickPop": get("clickPop"),
    "notification": get("notification")
}

async function play(name, volume) {
    let original = audioSources[name];
    let newSound = original.cloneNode(true);
    newSound.volume = volume
    newSound.id = "";
    body.appendChild(newSound);
    newSound.play();
    newSound.onended = () => body.removeChild(newSound);
}

let audioTracker = {
    "ripsound": Date.now(),
    "checkout": Date.now(),
    "clickPop": Date.now(),
    "notification": Date.now()
}

async function playRateLimited(name, volume, delay) {
    let lastPlay = audioTracker[name];
    if (Date.now() - lastPlay < delay) {
        return;
    }
    audioTracker[name] = Date.now();
    play(name, volume);
}

