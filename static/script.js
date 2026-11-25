
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const inputCount = document.getElementById("inputCount");
const outputCount = document.getElementById("outputCount");
const statusText = document.getElementById("status");
const humanizeBtn = document.getElementById("humanizeBtn");

const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const fileName = document.getElementById("fileName");
const documentBtn = document.getElementById("documentBtn");
const documentStatus = document.getElementById("documentStatus");
const documentLoader = document.getElementById("documentLoader");
const downloadFile = document.getElementById("downloadFile");

let selectedDocument = null;
let documentURL = null;
let documentProcessing = false;


// Word Counter

function countWords(text) {
    return text.trim() === ""
        ? 0
        : text.trim().split(/\s+/).length;
}

function updateCounts() {

    inputCount.textContent =
        countWords(inputText.value) + " words";

    outputCount.textContent =
        countWords(outputText.value) + " words";
}

inputText.addEventListener("input", updateCounts);


// Clear Text

function clearText() {

    inputText.value = "";
    outputText.value = "";
    statusText.textContent = "";

    updateCounts();
}


// Copy Text

async function copyText() {

    if (!outputText.value) return;

    try {
        await navigator.clipboard.writeText(
            outputText.value
        );

        statusText.textContent = "Text copied!";
    } catch (error) {
        statusText.textContent = "Unable to copy text.";
    }
}


// Normal Text Humanization

async function humanizeText() {

    const text = inputText.value.trim();
    const mode = document.getElementById("mode").value;

    if (!text) {
        statusText.textContent = "Please enter some text.";
        return;
    }

    if (text.length > 25000) {
        statusText.textContent = "Maximum 25,000 characters allowed.";
        return;
    }

    humanizeBtn.disabled = true;
    humanizeBtn.textContent = "Humanizing...";
    statusText.textContent = "Processing your text...";

    try {

        const response = await fetch("/humanize", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: text,
                mode: mode
            })

        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Humanization failed."
            );
        }

        outputText.value = data.humanized_text;

        updateCounts();

        statusText.textContent =
            "Text humanized successfully!";

    } catch (error) {

        statusText.textContent = error.message;

    } finally {

        humanizeBtn.disabled = false;
        humanizeBtn.textContent = "✦ Humanize Text";
    }
}


// Document Upload

function uploadFile(file) {

    if (!file || documentProcessing) return;

    selectedDocument = null;

    documentBtn.disabled = true;
    downloadFile.hidden = true;

    if (documentURL) {
        URL.revokeObjectURL(documentURL);
        documentURL = null;
    }

    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {

        fileName.textContent = "Invalid file format.";

        documentStatus.textContent =
            "Please upload PDF, DOCX or TXT.";

        return;
    }

    if (file.size > 10 * 1024 * 1024) {

        fileName.textContent = "File is too large.";

        documentStatus.textContent =
            "Maximum file size is 10 MB.";

        return;
    }

    selectedDocument = file;

    fileName.textContent = "Selected: " + file.name;

    documentStatus.textContent =
        "Document uploaded successfully.";

    // Enable Humanize Document Button

    documentBtn.disabled = false;

    documentBtn.style.opacity = "1";
    documentBtn.style.cursor = "pointer";

    console.log("Document selected:", file.name);
}


// Drag and Drop

dropZone.addEventListener("dragover", function(event) {

    event.preventDefault();

    dropZone.style.borderColor = "#a78bfa";
});

dropZone.addEventListener("dragleave", function(event) {

    event.preventDefault();

    dropZone.style.borderColor = "";
});

dropZone.addEventListener("drop", function(event) {

    event.preventDefault();

    dropZone.style.borderColor = "";

    const file = event.dataTransfer.files[0];

    uploadFile(file);
});


// Document Humanization

async function humanizeDocument() {

    if (documentProcessing) return;

    if (!selectedDocument) {

        documentStatus.textContent =
            "Please upload a document first.";

        return;
    }

    const mode = document.getElementById("mode").value;

    const formData = new FormData();

    formData.append("file", selectedDocument);
    formData.append("mode", mode);

    documentProcessing = true;

    documentBtn.disabled = true;
    fileInput.disabled = true;

    documentBtn.textContent = "Humanizing...";

    documentLoader.hidden = false;
    downloadFile.hidden = true;

    documentStatus.textContent =
        "Processing document. Please wait...";

    try {

        const response = await fetch(
            "/humanize-document",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {

            const data = await response.json().catch(
                () => ({
                    error: "Document processing failed."
                })
            );

            throw new Error(data.error);
        }

        const blob = await response.blob();

        if (documentURL) {
            URL.revokeObjectURL(documentURL);
        }

        documentURL = URL.createObjectURL(blob);

        downloadFile.href = documentURL;

        downloadFile.download =
            "Humanized_" + selectedDocument.name;

        downloadFile.hidden = false;

        documentStatus.textContent =
            "Your humanized document is ready!";

    } catch (error) {

        documentStatus.textContent = error.message;

    } finally {

        documentProcessing = false;

        documentBtn.disabled = false;
        fileInput.disabled = false;

        documentBtn.textContent =
            "✦ Humanize Document";

        documentLoader.hidden = true;
    }
}

updateCounts();
