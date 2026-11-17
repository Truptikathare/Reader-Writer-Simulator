// Reader-Writer Synchronization Simulator

let sharedData = 100;

let requestQueue = [];
let activeReaders = new Set();
let writerActive = false;

let readCount = 0;
let writeCount = 0;

let timers = new Map();

let operationDuration = 4000;
let nextRequestId = 1;

const readers = [1, 2, 3];

// HTML elements
const sharedDataDisplay =
    document.getElementById("sharedData");

const resourceMessage =
    document.getElementById("resourceMessage");

const resourceBadge =
    document.getElementById("resourceBadge");

const resourceBox =
    document.getElementById("resourceBox");

const message =
    document.getElementById("message");

const queueDisplay =
    document.getElementById("queue");

const queueCount =
    document.getElementById("queueCount");

const log =
    document.getElementById("log");

// Add activity to history
function addLog(text) {
    const item = document.createElement("div");

    item.className = "log-item";

    item.textContent =
        new Date().toLocaleTimeString() + " - " + text;

    log.prepend(item);
}

// Update a process card
function setProcessStatus(id, state) {
    const card = document.getElementById(id);

    if (!card) return;

    card.classList.remove(
        "reading",
        "waiting",
        "writing"
    );

    if (state === "Reading") {
        card.classList.add("reading");
    }

    if (state === "Waiting") {
        card.classList.add("waiting");
    }

    if (state === "Writing") {
        card.classList.add("writing");
    }

    card.querySelector(".status").textContent = state;
}

// Update all information on the screen
function updateDisplay() {

    readers.forEach(id => {
        const requestWaiting = requestQueue.some(
            request =>
                request.type === "reader" &&
                request.id === id
        );

        if (activeReaders.has(id)) {
            setProcessStatus("reader" + id, "Reading");
        } else if (requestWaiting) {
            setProcessStatus("reader" + id, "Waiting");
        } else {
            setProcessStatus("reader" + id, "Idle");
        }
    });

    const writerWaiting = requestQueue.some(
        request => request.type === "writer"
    );

    if (writerActive) {
        setProcessStatus("writer", "Writing");
    } else if (writerWaiting) {
        setProcessStatus("writer", "Waiting");
    } else {
        setProcessStatus("writer", "Idle");
    }

    // Update statistics
    document.getElementById("readerCount").textContent =
        readCount;

    document.getElementById("activeCount").textContent =
        activeReaders.size;

    document.getElementById("writeCount").textContent =
        writeCount;

    document.getElementById("pendingCount").textContent =
        requestQueue.length;

    // Update shared data
    sharedDataDisplay.textContent = sharedData;

    resourceBox.classList.remove(
        "busy-read",
        "busy-write"
    );

    if (writerActive) {
        resourceBox.classList.add("busy-write");

        resourceBadge.textContent = "WRITING";
        resourceMessage.textContent =
            "Writer is updating shared data.";

        resourceBadge.style.background = "#fcebed";
        resourceBadge.style.color = "#b52c3b";

    } else if (activeReaders.size > 0) {
        resourceBox.classList.add("busy-read");

        resourceBadge.textContent = "READING";
        resourceMessage.textContent =
            activeReaders.size + " reader(s) accessing data.";

        resourceBadge.style.background = "#e9f7ef";
        resourceBadge.style.color = "#16845a";

    } else {
        resourceBadge.textContent = "AVAILABLE";
        resourceMessage.textContent =
            "Shared resource is available.";

        resourceBadge.style.background = "#e8ecfb";
        resourceBadge.style.color = "#344b98";
    }

    // Display queue
    queueDisplay.innerHTML = "";

    if (requestQueue.length === 0) {
        queueDisplay.textContent = "No pending requests";
    } else {
        requestQueue.forEach(request => {
            const item = document.createElement("div");

            item.className = "queue-item";

            if (request.type === "writer") {
                item.classList.add("writer-request");
                item.textContent = "Writer";
            } else {
                item.textContent =
                    "Reader " + request.id;
            }

            queueDisplay.appendChild(item);
        });
    }

    queueCount.textContent =
        requestQueue.length + " REQUESTS";
}

// Add a reader request
function requestRead(id) {

    if (
        activeReaders.has(id) ||
        requestQueue.some(
            request =>
                request.type === "reader" &&
                request.id === id
        )
    ) {
        message.textContent =
            "Reader " + id + " already has a pending or active request.";
        return;
    }

    requestQueue.push({
        id: id,
        type: "reader",
        requestId: nextRequestId++
    });

    message.textContent =
        "Reader " + id + " requested access.";

    addLog("Reader " + id + " requested to read.");

    updateDisplay();
    processQueue();
}

// Add a writer request
function requestWrite() {

    if (
        writerActive ||
        requestQueue.some(
            request => request.type === "writer"
        )
    ) {
        message.textContent =
            "Writer already has a pending or active request.";
        return;
    }

    requestQueue.push({
        type: "writer",
        requestId: nextRequestId++
    });

    message.textContent =
        "Writer requested exclusive access.";

    addLog("Writer requested to write.");

    updateDisplay();
    processQueue();
}

// Process requests fairly using FIFO order
function processQueue() {

    // A writer must have exclusive access
    if (writerActive) return;

    // Existing readers can continue if no writer
    // is waiting at the front of the queue.
    if (activeReaders.size > 0) {

        if (
            requestQueue.length === 0 ||
            requestQueue[0].type === "writer"
        ) {
            return;
        }
    }

    if (requestQueue.length === 0) {
        updateDisplay();
        return;
    }

    // If the first request is a writer,
    // wait until all readers finish.
    if (requestQueue[0].type === "writer") {

        if (activeReaders.size === 0) {
            const request = requestQueue.shift();
            startWriter();
        }

        updateDisplay();
        return;
    }

    // Allow consecutive reader requests together
    while (
        requestQueue.length > 0 &&
        requestQueue[0].type === "reader" &&
        !writerActive
    ) {
        const request = requestQueue.shift();
        startReader(request.id);
    }

    updateDisplay();
}

// Start reader operation
function startReader(id) {

    activeReaders.add(id);

    readCount++;

    message.textContent =
        "Reader " + id + " is reading shared data.";

    addLog("Reader " + id + " started reading.");

    updateDisplay();

    const timer = setTimeout(() => {

        activeReaders.delete(id);

        timers.delete("reader" + id);

        message.textContent =
            "Reader " + id + " finished reading.";

        addLog("Reader " + id + " completed reading.");

        updateDisplay();

        // Check next waiting request
        processQueue();

    }, operationDuration);

    timers.set("reader" + id, timer);
}

// Start writer operation
function startWriter() {

    if (activeReaders.size > 0 || writerActive) {
        return;
    }

    writerActive = true;

    writeCount++;

    message.textContent =
        "Writer is updating the shared resource.";

    addLog("Writer started writing.");

    updateDisplay();

    const timer = setTimeout(() => {

        sharedData += 10;

        writerActive = false;

        timers.delete("writer");

        message.textContent =
            "Writer finished. Shared data updated.";

        addLog(
            "Writer completed. New shared data value: " +
            sharedData
        );

        updateDisplay();

        // Process next request
        processQueue();

    }, operationDuration);

    timers.set("writer", timer);
}

// Reset everything
function resetSimulation() {

    timers.forEach(timer => clearTimeout(timer));
    timers.clear();

    sharedData = 100;

    requestQueue = [];
    activeReaders.clear();
    writerActive = false;

    readCount = 0;
    writeCount = 0;

    nextRequestId = 1;

    message.textContent =
        "Simulation reset. Ready for new requests.";

    log.innerHTML = "";

    addLog("Simulation reset successfully.");

    updateDisplay();
}

// Button actions
document.getElementById("read1Btn")
    .addEventListener("click", () => requestRead(1));

document.getElementById("read2Btn")
    .addEventListener("click", () => requestRead(2));

document.getElementById("read3Btn")
    .addEventListener("click", () => requestRead(3));

document.getElementById("writeBtn")
    .addEventListener("click", requestWrite);

document.getElementById("resetBtn")
    .addEventListener("click", resetSimulation);

// Change operation duration
document.getElementById("speed")
    .addEventListener("change", function() {
        operationDuration = Number(this.value);
    });

// Initial display
updateDisplay();

addLog("Reader-Writer simulator initialized.");