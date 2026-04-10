const contractor = {
  name: "Unknown Contractor",
  requirements: {
    insurance: null,
    gasSafe: null,
    rams: null,
    electrical: null
  }
};

const uploadedFiles = [];
let browseInput = null;

function normalizeText(text) {
  return (text || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStatusForRequirement(document) {
  if (!document) return "Missing";
  return document.status;
}

function getBadgeClass(status) {
  if (status === "Verified") return "green";
  if (status === "Needs Review") return "orange";
  return "orange";
}

function renderCompliancePanel() {
  const rightPanel = document.querySelector(".panel.right");
  if (!rightPanel) return;

  const insuranceStatus = getStatusForRequirement(contractor.requirements.insurance);
  const gasSafeStatus = getStatusForRequirement(contractor.requirements.gasSafe);
  const ramsStatus = getStatusForRequirement(contractor.requirements.rams);
  const electricalStatus = getStatusForRequirement(contractor.requirements.electrical);

  rightPanel.innerHTML = `
    <h2>Contractor Compliance</h2>
    <div class="doc">
      <div><strong>${contractor.name}</strong></div>
    </div>
    <div class="doc">
      <div>Insurance</div>
      <span class="badge ${getBadgeClass(insuranceStatus)}">${insuranceStatus}</span>
    </div>
    <div class="doc">
      <div>Gas Safe</div>
      <span class="badge ${getBadgeClass(gasSafeStatus)}">${gasSafeStatus}</span>
    </div>
    <div class="doc">
      <div>RAMS</div>
      <span class="badge ${getBadgeClass(ramsStatus)}">${ramsStatus}</span>
    </div>
    <div class="doc">
      <div>Electrical</div>
      <span class="badge ${getBadgeClass(electricalStatus)}">${electricalStatus}</span>
    </div>
  `;
}

function classifyDocument(text) {
  const lower = text.toLowerCase();

  if (/(employers liability|public liability|insurance policy|insured)/.test(lower)) {
    return "insurance";
  }

  if (/(gas safe|gas safety|gas registration|registered gas engineer)/.test(lower)) {
    return "gasSafe";
  }

  if (/(risk assessment|method statement|rams)/.test(lower)) {
    return "rams";
  }

  if (/(electrical installation|eicr|electrical certificate|minor works certificate)/.test(lower)) {
    return "electrical";
  }

  return "unknown";
}

function extractInsuranceFields(text) {
  const companyMatch = text.match(/(?:company|insured|policyholder)[:\s]+([a-z0-9&.,\- ]{3,80})/i);
  const expiryMatch = text.match(/(?:expiry|expires|expiry date|valid until)[:\s]+(\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}|\d{1,2}\s+[a-z]{3,9}\s+\d{2,4})/i);
  const insurerMatch = text.match(/(?:insurer|underwriter|insurance company)[:\s]+([a-z0-9&.,\- ]{3,80})/i);

  return {
    company: companyMatch ? companyMatch[1].trim() : null,
    expiry: expiryMatch ? expiryMatch[1].trim() : null,
    insurer: insurerMatch ? insurerMatch[1].trim() : null
  };
}

function extractGasSafeFields(text) {
  const engineerMatch = text.match(/(?:engineer|installer|registered engineer)[:\s]+([a-z ,.'\-]{3,80})/i);
  const regMatch = text.match(/(?:reg(?:istration)?\s*(?:no|number)?|licen[cs]e\s*(?:no|number)?)[:\s#-]*([a-z0-9\-]{5,20})/i);

  return {
    engineer: engineerMatch ? engineerMatch[1].trim() : null,
    regNumber: regMatch ? regMatch[1].trim() : null
  };
}

function extractRamsFields(text) {
  const titleMatch = text.match(/(?:title|project|document title)[:\s]+([a-z0-9&.,\- ]{3,100})/i);
  const dateMatch = text.match(/(?:date|issued|revision date)[:\s]+(\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}|\d{1,2}\s+[a-z]{3,9}\s+\d{2,4})/i);

  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    date: dateMatch ? dateMatch[1].trim() : null
  };
}

function extractElectricalFields(text) {
  const companyMatch = text.match(/(?:company|contractor|installer)[:\s]+([a-z0-9&.,\- ]{3,80})/i);
  const certTypeMatch = text.match(/(?:certificate type|cert(?:ificate)?|document type)[:\s]+([a-z0-9&.,\- ]{3,80})/i);
  const dateMatch = text.match(/(?:date|issue date|inspection date)[:\s]+(\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}|\d{1,2}\s+[a-z]{3,9}\s+\d{2,4})/i);

  return {
    company: companyMatch ? companyMatch[1].trim() : null,
    certType: certTypeMatch ? certTypeMatch[1].trim() : null,
    date: dateMatch ? dateMatch[1].trim() : null
  };
}

function buildDocumentResult(type, fields, fileName) {
  const values = Object.values(fields);
  const fieldsRequired = values.length;
  const fieldsFound = values.filter(Boolean).length;
  const confidence = fieldsRequired === 0 ? 0 : fieldsFound / fieldsRequired;
  const status = confidence >= 0.8 ? "Verified" : "Needs Review";

  return {
    type,
    fileName,
    fields,
    confidence,
    status
  };
}

function extractFieldsByType(type, text) {
  if (type === "insurance") return extractInsuranceFields(text);
  if (type === "gasSafe") return extractGasSafeFields(text);
  if (type === "rams") return extractRamsFields(text);
  if (type === "electrical") return extractElectricalFields(text);
  return {};
}

async function ensurePdfJs() {
  if (window.pdfjsLib) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  if (!window.pdfjsLib) {
    throw new Error("pdf.js failed to load");
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";
}

async function extractTextFromPdf(file) {
  await ensurePdfJs();

  const buffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += ` ${pageText}`;
  }

  return normalizeText(fullText);
}

function mapDocumentToContractor(result) {
  if (!result || result.type === "unknown") return;

  contractor.requirements[result.type] = result;

  if (result.type === "insurance" && result.fields.company) {
    contractor.name = result.fields.company;
  }

  if (contractor.name === "Unknown Contractor" && result.type === "electrical" && result.fields.company) {
    contractor.name = result.fields.company;
  }

  if (contractor.name === "Unknown Contractor" && result.type === "gasSafe" && result.fields.engineer) {
    contractor.name = result.fields.engineer;
  }
}

function renderUploadsList() {
  const uploadsContainer = document.querySelector(".uploads");
  if (!uploadsContainer) return;

  uploadsContainer.innerHTML = "";
  uploadedFiles.forEach((file) => {
    const item = document.createElement("div");
    item.className = "upload";
    item.textContent = file.name;
    uploadsContainer.appendChild(item);
  });
}

function addUploadedFiles(files) {
  const pdfFiles = Array.from(files || []).filter((file) => /\.pdf$/i.test(file.name));

  pdfFiles.forEach((file) => {
    const exists = uploadedFiles.some((existing) => existing.name === file.name && existing.size === file.size);
    if (!exists) uploadedFiles.push(file);
  });

  renderUploadsList();
}

function setupUploadInteractions() {
  const dropzone = document.querySelector(".dropzone");
  const browseButton = dropzone ? dropzone.querySelector("button") : null;

  if (!dropzone || !browseButton) return;

  browseInput = document.createElement("input");
  browseInput.type = "file";
  browseInput.accept = ".pdf,application/pdf";
  browseInput.multiple = true;
  browseInput.style.display = "none";
  document.body.appendChild(browseInput);

  browseButton.addEventListener("click", () => {
    browseInput.click();
  });

  browseInput.addEventListener("change", (event) => {
    addUploadedFiles(event.target.files);
    browseInput.value = "";
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    addUploadedFiles(event.dataTransfer.files);
  });
}

async function processUploadedDocuments() {
  for (const file of uploadedFiles) {
    try {
      const text = await extractTextFromPdf(file);
      const type = classifyDocument(text);
      const fields = extractFieldsByType(type, text);
      const result = buildDocumentResult(type, fields, file.name);
      mapDocumentToContractor(result);
    } catch (error) {
      console.error(`Failed processing ${file.name}:`, error);
    }
  }

  renderCompliancePanel();
}

function startProcessing() {
  let percent = 0;

  const el = document.getElementById("percent");
  const ring = document.getElementById("ring");
  const documentSheet = document.getElementById("documentSheet");

  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");

  clearInterval(window.colmariInterval);

  percent = 0;
  el.innerText = "0%";

  step1.style.color = "#00ffc6";
  step2.style.color = "#7fa6b3";
  step3.style.color = "#7fa6b3";

  if (documentSheet) {
    documentSheet.classList.remove("move-in");
    void documentSheet.offsetWidth;
    documentSheet.classList.add("move-in");
  }

  function getSpeed(p) {
    if (p < 30) return 12;
    if (p < 70) return 22;
    return 35;
  }

  async function updateProgress() {
    const increment = Math.random() * 1.5 + 0.5;
    percent += increment;

    if (percent > 100) percent = 100;

    const display = Math.floor(percent);
    el.innerText = `${display}%`;

    ring.style.background = `conic-gradient(#00ffc6 ${display}%, rgba(19, 44, 61, 0.95) ${display}%)`;

    if (display >= 30 && display < 70) {
      step1.style.color = "#7fa6b3";
      step2.style.color = "#00ffc6";
    }

    if (display >= 70) {
      step2.style.color = "#7fa6b3";
      step3.style.color = "#00ffc6";
    }

    if (display >= 100) {
      clearInterval(window.colmariInterval);
      ring.style.boxShadow = "0 0 45px rgba(0,255,198,0.6)";

      await processUploadedDocuments();

      setTimeout(() => {
        ring.style.boxShadow = "0 0 28px rgba(0,255,198,0.3)";
      }, 600);

      return;
    }

    window.colmariInterval = setTimeout(updateProgress, getSpeed(display));
  }

  updateProgress();
}

document.addEventListener("DOMContentLoaded", () => {
  setupUploadInteractions();
  renderCompliancePanel();
});
