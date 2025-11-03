let get = (item) => {return document.getElementById(item);}

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

let ticketArea = get("ticketBar");

let storePage = get("storePage");

let cart = get("cart");

let looseTickets = get("looseTickets");

let ticketStack = get("ticketStack");

let button = get("button");

let numpad = get("numpad");

let itemSection = get("itemSection");

let cartContainer = get("cartContainer");

let afterScreen = get("afterScreen");

let body = document.querySelector("body");

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

function getAvailableLooseTickets() {
    let availableSpace = looseTickets.getBoundingClientRect().height;
    let ticketUnitSize = 40;
    return Math.floor(availableSpace / ticketUnitSize);
}

function addLooseTicket() {
    let newTicket = document.createElement("img");
    let left = Math.random() * 100 % 50 - 25;
    newTicket.src = "images/ticket.png";
    newTicket.classList.add("ticket");
    newTicket.style.left = left.toString() + "%";
    let rotation = Math.random() * 100 % 20 - 10;
    newTicket.style.transform = "rotate(" + rotation.toString() + "deg)";
    looseTickets.appendChild(newTicket);
}

function addStackTicket() {
    let left = Math.random() * 100 % 10 - 5;
    let newTicket = document.createElement("img");
    newTicket.src = "images/ticket.png";
    newTicket.style.left = left.toString() + "%";
    newTicket.classList.add("ticket");
    ticketStack.appendChild(newTicket);
}

function addTicket() {
    if (looseTickets.children.length < getAvailableLooseTickets()) {
        addLooseTicket();
    }
    else {
        addStackTicket();
    }
    // adding to the stack may push a loose ticket offscreen
    while (looseTickets.children.length > getAvailableLooseTickets() && getAvailableLooseTickets() > 0) {
        if (looseTickets.children.length > 0)
            looseTickets.removeChild(looseTickets.children[0]);
        addStackTicket();
    }
}

async function distributeTickets() {
    await asyncLoop(
        (() => looseTickets.children.length < getAvailableLooseTickets() - 1 && ticketStack.children.length > 0),
        () => {
            ticketStack.removeChild(ticketStack.children[0]);
            addLooseTicket();
        },
        60
    );
}

function ripTicket() {
    playRateLimited("ripsound", 0.2, 25);
    let ticket = null;
    let container = null;
    if (looseTickets.children.length > 0) {
        ticket = looseTickets.children[looseTickets.children.length - 1];
        container = looseTickets;
    }
    else {
        ticket = ticketStack.children[ticketStack.children.length - 1];
        container = ticketStack;
    }
    let rect = ticket.getBoundingClientRect();
    let clone = ticket.cloneNode(true);
    container.removeChild(ticket);
    let body = document.querySelector("body");
    clone.style.position = "absolute";
    let leftPercent = rect.left / document.documentElement.clientWidth * 100;
    let topPercent = rect.top / document.documentElement.clientHeight * 100;
    clone.style.left = leftPercent.toString() + "%";
    clone.style.top = topPercent.toString() + "%";
    setTimeout(() => {
        clone.classList.add("ripped");
    }, 100);
    setTimeout(() => {
        body.removeChild(clone);
    }, 1000)
    body.appendChild(clone);
}

let ticketsAnimating = new Promise(resolve => resolve());

async function setTickets(number, interval) {
    await ticketsAnimating;
    ticketsAnimating = new Promise(async (resolve) => {
        let difference = Math.abs(number - (ticketCount));
        if (number > 0)
            get("ticketAmount").textContent = ": " + number.toString();
        else get("ticketAmount").textContent = "";
        if (number < 2) {
            get("submitIcon").classList.remove("minimized");
            signal("You're out of tickets! Time to check out.", 3);
        }
        else {
            get("submitIcon").classList.add("minimized");
        }
        await asyncLoop(
            () => looseTickets.children.length + ticketStack.children.length > number,
            () => ripTicket(),
            interval / difference
        );
        await distributeTickets();
        await asyncLoop( 
            () => looseTickets.children.length + ticketStack.children.length < number,
            () => addTicket(),
            interval / difference
        );
        filterCards();
        resolve();
    });
}

function validateHex(string) {
    if (string[0] !== "#") return false;
    if (!(string.length == 7 || string.length == 9)) return false;
    for (let i = 1; i < string.length; i++) {
        if (!("1234567890abcdefABCDEF".includes(string[i]))) return false;
    }
    return true;
}

function addColor(hexString1, hexString2, negative) {
    if (
            !(
                validateHex(hexString1) && 
                validateHex(hexString2)
            ) || 
            hexString1.length !== 7 || 
            hexString2.length !== 7
        ) return;
    let color1 = [parseInt(hexString1.slice(1, 3), 16), parseInt(hexString1.slice(3, 5), 16), parseInt(hexString1.slice(5, 7), 16)];
    let color2 = [parseInt(hexString2.slice(1, 3), 16), parseInt(hexString2.slice(3, 5), 16), parseInt(hexString2.slice(5, 7), 16)];
    let finalColor = [
      Math.min(255, Math.max(0, color1[0] + color2[0] * ((negative * 2) - 1))),
      Math.min(255, Math.max(0, color1[1] + color2[1] * ((negative * 2) - 1))),
      Math.min(255, Math.max(0, color1[2] + color2[2] * ((negative * 2) - 1)))
    ];
    return "#" + finalColor[0].toString(16).padStart(2, "0") + finalColor[1].toString(16).padStart(2, "0") + finalColor[2].toString(16).padStart(2, "0");
}

function makeButton(color, label, callBack, wrapInDiv=true) {
    let content = get("button").content.cloneNode(true);
    let button = null;
    if (wrapInDiv) {
        button = document.createElement('div');
        button.appendChild(content);
    }
    else {
        button = content.querySelector("svg");
    }
    for (let el of button.querySelectorAll(".highLight")) {
        el.setAttribute("stop-color", addColor(color, "#333333", false));
    }

    for (let el of button.querySelectorAll(".lowLight")) {
        el.setAttribute("stop-color", addColor(color, "#333333", true));
    }
    let grad1 = button.querySelector(".shine1");
    let grad2 = button.querySelector(".shine2");
    let id1 = "shine1" + color.toString().slice(1);
    let id2 = "shine2" + color.toString().slice(1);
    grad1.id = id1;
    grad2.id = id2;
    button.querySelector(".mainColor").setAttribute("fill", color);
    button.querySelector(".buttonLabel").textContent = label;
    button.querySelector(".outerRing").setAttribute("fill", "url(#" + id1 + ")");
    button.querySelector(".innerRing").setAttribute("fill", "url(#" + id2 + ")");
    button.onclick = callBack;
    return button;
}

function removeNumpad() {
    get("numpadContainer").classList.add("minimized");
}

function numpadSetup() {
    let input = get("input");
    for (let i = 0; i < 12; i++) {
        let label = null;
        let callBack = null;
        let color = null;
        if (i < 9) {
            label = (i + 1).toString();
            callBack = () => input.textContent += label;
            color = getVar("--gray");
        }
        else if (i === 10) {
            label = (0).toString();
            callBack = () => input.textContent += label;
            color = getVar("--gray");
        }
        else if (i === 9) {
            label = "✓";
            callBack = loadMainContent;
            color = getVar("--blue");
        }
        else if (i === 11) {
            label = "X";
            callBack = () => input.textContent = "";
            color = getVar("--red");
        }
        let newButton = makeButton(color, label, callBack);
        numpad.appendChild(newButton);
    }
}

function updateCartElements() {
    if (Object.entries(cartItems).length > 0) {
        get("hintText").classList.add("minimized");
        get("cartSubmitContainer").classList.remove("minimized");
    }
    else {
        console.log("hello");
        get("hintText").classList.remove("minimized");
        get("cartSubmitContainer").classList.add("minimized");
    }
}

function addCartItem(card) {
    let newCard = null;
    if (card.name in cartItems) {
        cartItems[card.name]++;
        cartDivs[card.name].querySelector(".count p").textContent = cartItems[card.name].toString();
    }
    else {
        newCard = card.cloneNode(true);
        newCard.ticketValue = card.ticketValue;
        newCard.name = card.name;
        let deleteButton = makeButton(getVar("--red"), "x", () => {
            cartItems[card.name]--;
            ticketCount += parseInt(newCard.ticketValue);
            setTickets(ticketCount, 1000);
            if (cartItems[card.name] === 0) {
                delete cartItems[card.name];
                cartContainer.removeChild(newCard);
            }
            else {
                newCard.querySelector(".count p").textContent = cartItems[card.name].toString();
            }
            updateCartElements();
            filterCards();
        }, false);
        let count = document.createElement("div");
        count.appendChild(document.createElement("p"));
        count.classList.add("count");
        deleteButton.classList.add("delete");
        Object.assign(cartItems, {[card.name]: 1});
        Object.assign(cartDivs, {[card.name]: newCard});
        newCard.appendChild(deleteButton);
        newCard.appendChild(count);
        cartContainer.appendChild(newCard);
        newCard.querySelector(".count p").textContent = cartItems[card.name].toString();
        updateCartElements();
    }
}

function loadCard(ticketValue, name) {
    let newCard = get("itemCard").content.firstElementChild.cloneNode(true);
    newCard.querySelector(".purchaseName").textContent = name + ": " + ticketValue.toString();
    newCard.querySelector(".purchaseThumbnail").src = "images/prizes/" + name + ".jpg";
    newCard.ticketValue = ticketValue;
    newCard.name = name;
    newCard.onclick = async () => {
        let start = Date.now();
        await ticketsAnimating;
        if (Date.now() > start) { // await was not a no-op
            return;
        }
        if (ticketCount >= ticketValue) {
            play("clickPop", 0.1);
            ticketCount -= ticketValue;
            setTickets(ticketCount, 1000);
            addCartItem(newCard);
            newCard.classList.add("depressed");
            setTimeout(() => newCard.classList.remove("depressed"), 100);
        }
        else signal("You don't have enough tickets left", 2);
    }
    let ticketIndicator = newCard.querySelector(".ticketIndicator");
    for (let i = 0; i < ticketValue; i++) {
        let newTicket = document.createElement("img");
        newTicket.src = "images/ticket.png";
        ticketIndicator.appendChild(newTicket);
    }
    itemSection.appendChild(newCard);
}

async function loadPrizes(ticketValue) {
    itemSection.innerHTML = "";
    let records = await fetch("prizes.json");
    let recordsJSON = await records.json();
    console.log(recordsJSON);
    let thisPage = null;
    if (ticketValue === "All") {
        thisPage = [];
        for (let [key, value] of Object.entries(recordsJSON)) {
            for (let item of value) {
                await loadCard(key, item);
            }
        }
    }
    else {
        thisPage = recordsJSON[ticketValue];
        for (let item of thisPage) {
            await loadCard(ticketValue, item);
        }
    };
    filterCards();
}

function moveSliderBehind(item) {
    let slider = get("slider");
    let containerRect = item.parentElement.getBoundingClientRect();
    let rect = item.getBoundingClientRect();

    slider.style.width = rect.width + "px";
    slider.style.height = rect.height + "px";
    slider.style.transform = "translate(" + (rect.left - containerRect.left).toString() + "px, 0)";
}

function loadMainContent() {
    ticketCount = parseInt(input.textContent);
    initialTicketCount = ticketCount;
    if (ticketCount > 90 || ticketCount < 2 || isNaN(ticketCount)) {
        signal("Ticket limit is between 2 and 90", 2);
        return;
    }
    removeNumpad();
    ticketBar.classList.remove("isLarger");
    mainContent.classList.remove("minimized");
    cart.classList.remove("minimized");
    get("cartSubmitContainer").onclick = () => {showResults(); play("checkout", 0.5);};
    get("ticketLabel").textContent = "Tickets";
    setTickets(ticketCount, 1000);
    let ticketAmounts = ["All", 2, 4, 8, 10, 15, 30, 40];
    let ticketSelect = get("ticketSelect");
    for (let i = 0; i < ticketAmounts.length; i++) {
        let selector = ticketSelect.children[i+1]; // skip highlight span
        let amount = ticketAmounts[i];
        selector.onclick = () => {
            play("clickPop", 0.1);
            moveSliderBehind(selector);
            selected = selector;
            loadPrizes(ticketAmounts[i]);
        };
        if (i == 0) setTimeout(() => {selector.onclick();}, 400);
    }
    get("headerImg").onclick = reset;
}

function showResults() {
    storePage.classList.add("minimized");
    afterScreen.classList.remove("minimized");
    afterScreen.appendChild(cartContainer);
}

function filterCards() {
    for (let card of itemSection.children) {
        if (card.ticketValue > ticketCount) {
            card.classList.add("tooExpensive");
        }
        else {
            card.classList.remove("tooExpensive");
        }
    }
}

function signal(message, duration) {
    play("notification", 1);
    console.log(message);
    let newMessage = document.createElement("div");
    newMessage.id = "message";
    let text = document.createElement("p");
    text.textContent = message;
    newMessage.appendChild(text);
    body.appendChild(newMessage); 
    setTimeout(() =>{
        body.removeChild(newMessage);
    }, duration * 1000);
}
    

function reset() {
    cartItems = {};
    cartDivs = {};
    ticketSelection = "All";
    ticketCount = 0;
    initialTicketCount = 0;
    selected = null;
    setTickets(ticketCount, 0.1);
    ticketArea.classList.add("isLarger");
    cart.classList.add("minimized");
    mainContent.classList.add("minimized");
    get("numpadContainer").classList.remove("minimized");
    get("input").textContent = "";
    for (let card of cartContainer.querySelectorAll(".purchaseItem")) {
        cartContainer.removeChild(card);
    }
    storePage.classList.remove("minimized");
    afterScreen.classList.add("minimized");
}

let cartItems = {};
let cartDivs = {};
let ticketSelection = "All";
let ticketCount = 0;
let initialTicketCount = 0;
let selected = null;

window.onresize = () => {if (selected) moveSliderBehind(selected)};

numpadSetup();
