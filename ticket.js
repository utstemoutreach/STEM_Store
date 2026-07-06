export class Tickets {
    constructor(stackContainer, looseContainer, newAmountCallback) {
        this.ticketCount = 0;
        this.stackContainer = stackContainer;
        this.looseContainer = looseContainer;
        this.distributePromise = null;
        this.distributeResolve = null;
        this.running = false;
        this.runningIndex = 0;
        this.newAmountCallback = newAmountCallback;
    }
    propCount() {
        return this.stackContainer.children.length + this.looseContainer.children.length;
    }
    handleTotalOverflow() {
        console.error ("TOTAL TICKET OVERLOAD!");
    }
    addStackProp() {
        let left = Math.random() * 100 % 10 - 5;
        let newTicket = document.createElement("img");
        newTicket.src = "images/ticket.png";
        newTicket.style.left = left.toString() + "%";
        newTicket.classList.add("ticket");
        this.stackContainer.appendChild(newTicket);
    }
    estimateLoosePotential() {
        let availableSpace = looseTickets.getBoundingClientRect().height;
        let ticketUnitSize = 55;
        return (Math.floor(availableSpace / ticketUnitSize)) - this.looseContainer.children.length;
    }
    verifyLooseProp(goodCallback, badCallback) {
        let looseTop = this.looseContainer.children[this.looseContainer.children.length - 1];
        if (looseTop?.getBoundingClientRect().bottom > this.looseContainer.getBoundingClientRect().bottom) {
            badCallback();
        }
        else {
            goodCallback();
        }
    }
    addLooseProp() {
        let newTicket = document.createElement("img");
        newTicket.src = "images/ticket.png";
        newTicket.classList.add("ticket");
        let left = Math.random() * 100 % 50 - 25;
        newTicket.style.left = left.toString() + "%";
        let rotation = Math.random() * 100 % 20 - 10;
        newTicket.style.transform = "rotate(" + rotation.toString() + "deg)";
        this.looseContainer.appendChild(newTicket);
    }
    transferToLoose() {
        let stackTop = this.stackContainer.children[this.stackContainer.children.length - 1];
        let looseTop = this.looseContainer.children[this.looseContainer.children.length - 1];
        if (this.stackContainer.children.length <= 0) return;
        this.stackContainer.removeChild(stackTop);
        this.addLooseProp();
    }
    transferToStack() {
        let stackTop = this.stackContainer.children[this.stackContainer.children.length - 1];
        let looseTop = this.looseContainer.children[this.looseContainer.children.length - 1];
        if (this.looseContainer.children.length <= 0) return;
        this.looseContainer.removeChild(looseTop);
        this.addStackProp();
    }
    ripProp() {
        playRateLimited("ripsound", 0.2, 25);
        let ticket = null;
        let container = null;
        if (looseTickets.children.length > 0) {
            ticket = looseTickets.children[looseTickets.children.length - 1];
            container = this.looseContainer;
        }
        else {
            ticket = ticketStack.children[ticketStack.children.length - 1];
            container = this.stackContainer;
        }
        let rect = ticket.getBoundingClientRect();
        let clone = ticket.cloneNode(true);
        container.removeChild(ticket);
        let body = document.querySelector("body");
        clone.style.position = "absolute";
        let leftPercent = rect.left / window.innerWidth * 100;
        let topPercent = rect.top / window.innerHeight * 100;
        clone.style.left = rect.left.toString() + "px";
        clone.style.top = rect.top.toString() + "px";
        setTimeout(() => {
            clone.classList.add("ripped");
        }, 100);
        setTimeout(() => {
            body.removeChild(clone);
        }, 1000)
        body.appendChild(clone);
    }
    setTickets(count) {
        this.ticketCount = count;
        this.notifyUpdate();
        if (this.newAmountCallback) this.newAmountCallback(this.ticketCount);
    }
    addTickets(count) {
        this.setTickets(this.ticketCount + count);
    }
    removeTickets(count) {
        this.setTickets(this.ticketCount - count);
    }
    notifyUpdate() {
        this.distributePromise = new Promise(res => {
            if (this.distributeResolve) this.distributeResolve();
            this.distributeResolve = res;
        });
    }
    distributeTickets() {
        let stackTop = this.stackContainer.children[this.stackContainer.children.length - 1];
        let looseTop = this.looseContainer.children[this.looseContainer.children.length - 1];
        if (stackTop?.getBoundingClientRect().bottom > window.innerHeight) {
            this.handleTotalOverflow();
            return;
        }
        else if (looseTop?.getBoundingClientRect().bottom > this.looseContainer.getBoundingClientRect().bottom) {
            this.looseContainer.removeChild(looseTop);
            this.addStackProp();
            requestAnimationFrame(this.distributeTickets.bind(this));
        }
        else if (this.estimateLoosePotential() > 0) {
            this.transferToLoose();
            requestAnimationFrame(this.verifyLooseProp.bind(
                this,
                this.distributeTickets.bind(this),
                this.transferToStack.bind(this)
            ));
        }
    }
    stop() {
        this.setTickets(0);
        this.running = false;
        this.runningIndex++;
        this.looseContainer.replaceChildren();
        this.stackContainer.replaceChildren();
        this.newAmountCallback = null;
        this.distributeResolve();
    }
    async init(count) {
        console.log(this.running);
        if (this.running) return;
        this.running = true;
        let runningIndex = this.runningIndex;
        if (count == null) count = 0;
        this.setTickets(count);
        while (this.runningIndex === runningIndex) {
            while (this.propCount() < this.ticketCount) {
                this.addStackProp();
                requestAnimationFrame(this.distributeTickets.bind(this));
                await new Promise(res=>setInterval(res, 15));
            }
            while (this.propCount() > this.ticketCount) {
                this.ripProp();
                requestAnimationFrame(this.distributeTickets.bind(this));
                await new Promise(res=>setInterval(res, 50));
            }
            await this.distributePromise;
        }
    }
}
