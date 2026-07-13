import * as ticket from "./ticket.js";
const SVG_NS = 'http://www.w3.org/2000/svg';

let get = (item) => {return document.getElementById(item);}

function getVar(varname) {
    return getComputedStyle(document.documentElement).getPropertyValue(varname).trim();
}

let ticketArea = get("ticketBar");

let storePage = get("storePage");

let cart = get("cart");

let button = get("button");

let numpad = get("numpad");

let itemSection = get("itemSection");

let cartContainer = get("cartContainer");

let afterScreen = get("afterScreen");

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

let gradientIDs = {};
function makeGradient(color1, color2) {
    let id = `shine${color1.replace("#", "_")}${color2.replace("#", "_")}`;
    let defs = get("gradient-defs");
    if (gradientIDs[id] != undefined) {
        return id;
    }
    let gradient = document.createElementNS(SVG_NS, 'linearGradient');
    let stop1 = document.createElementNS(SVG_NS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', color1.toString());
    let stop2 = document.createElementNS(SVG_NS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', color2);

    defs.appendChild(gradient);
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    gradient.id = id;
    gradientIDs[id] = id;
    return id;
}

function makeGradients(color) {
    return [
        makeGradient(addColor(color, "#333333", true), addColor(color, "#333333", false)),
        makeGradient(addColor(color, "#333333", false), addColor(color, "#333333", true)),
    ];
}

function makeButton(color, label, callback, wrapInDiv=true) {
    let [id1, id2] = makeGradients(color);
    let content = get("button").content.cloneNode(true);
    let button = null;
    if (wrapInDiv) {
        button = document.createElement('div');
        button.appendChild(content);
    }
    else {
        button = content.querySelector("svg");
    }
    button.querySelector(".mainColor").setAttribute("fill", color);
    button.querySelector(".buttonLabel").textContent = label;
    button.querySelector(".outerRing").setAttribute("fill", "url(#" + id1 + ")");
    button.querySelector(".innerRing").setAttribute("fill", "url(#" + id2 + ")");
    button.onclick = callback;
    return button;
}

function removeNumpad() {
    get("numpadContainer").classList.add("minimized");
}

function numpadSetup() {
    let input = get("input");
    for (let i = 0; i < 12; i++) {
        let label = null;
        let callback = null;
        let color = null;
        if (i < 9) {
            label = (i + 1).toString();
            callback = () => input.textContent += label;
            color = getVar("--gray");
        }
        else if (i === 10) {
            label = (0).toString();
            callback = () => input.textContent += label;
            color = getVar("--gray");
        }
        else if (i === 9) {
            label = "✓";
            callback = loadMainContent;
            color = getVar("--blue");
        }
        else if (i === 11) {
            label = "X";
            callback = () => input.textContent = "";
            color = getVar("--red");
        }
        let newButton = makeButton(color, label, callback);
        numpad.appendChild(newButton);
    }
}

function updateCartElements() {
    if (Object.entries(cartItems).length > 0) {
        get("hintText").classList.add("minimized");
        get("cartSubmitContainer").classList.remove("minimized");
    }
    else {
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
            tickets.addTickets(parseInt(newCard.ticketValue), 1000);
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
    console.log(newCard.name);
    newCard.onclick = async () => {
        if (tickets.ticketCount >= ticketValue) {
            play("clickPop", 0.1);
            tickets.removeTickets(ticketValue, 1000);
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
    return newCard;
}

function addCard(ticketValue, name) {
    itemSection.appendChild(loadCard(ticketValue, name));
}

async function loadPrizes(ticketValue) {
    itemSection.innerHTML = "";
    let records = await fetch("prizes.json");
    let recordsJSON = await records.json();
    let thisPage = null;
    if (ticketValue === "All") {
        thisPage = [];
        for (let [key, value] of Object.entries(recordsJSON)) {
            for (let item of value) {
                addCard(key, item);
            }
        }
    }
    else {
        thisPage = recordsJSON[ticketValue];
        for (let item of thisPage) {
            addCard(ticketValue, item);
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
    let ticketMin = 2;
    let ticketMax = 100;
    let ticketCount = 0;
    if (ticketCountOverride == null) {
        ticketCount = parseInt(input.textContent);
    }
    else {
        ticketCount = ticketCountOverride;
    }
    if (ticketCount > ticketMax || ticketCount < ticketMin || isNaN(ticketCount)) {
        signal(`Ticket limit is between ${ticketMin} and ${ticketMax}`, 2);
        return;
    }
    removeNumpad();
    tickets.init(ticketCount);
    ticketBar.classList.remove("isLarger");
    mainContent.classList.remove("minimized");
    cart.classList.remove("minimized");
    get("cartSubmitContainer").onclick = () => {showResults(); play("checkout", 0.5);};
    get("ticketLabel").textContent = "Tickets";
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
}

function showResults() {
    if (tickets.ticketCount == 1) {
        let candy = loadCard(2, "Small Candy");
        addCartItem(candy);
    }
    storePage.classList.add("minimized");
    afterScreen.classList.remove("minimized");
    afterScreen.appendChild(cartContainer);
}

function filterCards() {
    for (let card of itemSection.children) {
        if (card.ticketValue > tickets.ticketCount) {
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
    tickets.stop();
    selected = null;
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
let selected = null;

let tickets = new ticket.Tickets(get("ticketStack"), get("looseTickets"), (number) => {
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
        filterCards();
});

let ticketCountOverride = null;

window.addEventListener('resize', () => {if (selected) moveSliderBehind(selected)});
window.addEventListener('resize', () => {tickets.notifyUpdate()});
numpadSetup();
