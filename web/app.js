(() => {
  const INPUT_STATE_KEY = "autofigure_input_state_v1";

  const page = document.body.dataset.page;
  if (page === "input") {
    initInputPage();
  } else if (page === "canvas") {
    initCanvasPage();
  }

  function $(id) {
    return document.getElementById(id);
  }

  function initInputPage() {
    const DEFAULT_IMAGE_MODEL = "google/gemini-3-pro-image-preview";
    const DEFAULT_SVG_MODEL = "google/gemini-3.1-pro-preview";
    const confirmBtn = $("confirmBtn");
    const errorMsg = $("errorMsg");
    const methodTextInput = $("methodText");
    const uploadZone = $("uploadZone");
    const pdfFile = $("pdfFile");
    const pdfUploadBtn = $("pdfUploadBtn");
    const pdfStatus = $("pdfStatus");
    const providerInput = $("provider");
    const imageModelInput = $("imageModel");
    const svgModelInput = $("svgModel");
    const baseUrlInput = $("baseUrl");
    const referenceFile = $("referenceFile");
    const referencePreviewLink = $("referencePreviewLink");
    const referencePreview = $("referencePreview");
    const referenceStatus = $("referenceStatus");
    const presetGrid = $("presetGrid");
    const samBackend = $("samBackend");
    const samPrompt = $("samPrompt");
    const samApiKeyGroup = $("samApiKeyGroup");
    const samApiKeyInput = $("samApiKey");
    let uploadedReferencePath = null;
    let selectedPresetId = null;
    const presetMetaById = {
      MinimalistPixel: {
        description: "简洁布局，搭配可爱的像素风角色",
        order: 1,
      },
      Cartoon: {
        description: "温暖手绘感风格，常见可爱机器人与植物元素",
        order: 2,
      },
      Biology: {
        description: "偏学术的生物插画风格",
        order: 3,
      },
      ModernUIFlat: {
        description: "结构化排版，色块简洁、配色柔和",
        order: 4,
      },
      "Hand-DrawnSketch": {
        description: "线稿手绘风，细节有温暖点缀",
        order: 5,
      },
      RealisticTechnical: {
        description: "写实图像结合技术标注说明",
        order: 6,
      },
      Nature: {
        description: "高质量 3D 渲染，整体偏专业学术风",
        order: 7,
      },
    };

    function loadInputState() {
      try {
        const raw = window.sessionStorage.getItem(INPUT_STATE_KEY);
        if (!raw) {
          return null;
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch (_err) {
        return null;
      }
    }

    function saveInputState() {
      const state = {
        methodText: $("methodText")?.value ?? "",
        provider: providerInput?.value ?? "openrouter",
        apiKey: $("apiKey")?.value ?? "",
        optimizeIterations: $("optimizeIterations")?.value ?? "0",
        imageModel: imageModelInput?.value ?? DEFAULT_IMAGE_MODEL,
        svgModel: svgModelInput?.value ?? DEFAULT_SVG_MODEL,
        baseUrl: baseUrlInput?.value ?? "https://openrouter.ai/api/v1",
        samBackend: samBackend?.value ?? "roboflow",
        samPrompt: samPrompt?.value ?? "icon,person,robot,animal",
        samApiKey: samApiKeyInput?.value ?? "",
        referencePath: uploadedReferencePath,
        selectedPresetId,
        referenceUrl: referencePreview?.src ?? "",
        referenceStatus: referenceStatus?.textContent ?? "",
      };
      try {
        window.sessionStorage.setItem(INPUT_STATE_KEY, JSON.stringify(state));
      } catch (_err) {
        // Ignore storage failures (e.g. private mode / quota)
      }
    }

    function applyInputState() {
      const state = loadInputState();
      if (!state) {
        return;
      }
      if (methodTextInput && typeof state.methodText === "string") {
        methodTextInput.value = state.methodText;
      }
      if (typeof state.provider === "string" && providerInput) {
        providerInput.value = state.provider || "openrouter";
      }
      if (typeof state.apiKey === "string") {
        $("apiKey").value = state.apiKey;
      }
      if (typeof state.optimizeIterations === "string" && $("optimizeIterations")) {
        $("optimizeIterations").value = state.optimizeIterations;
      }
      if (typeof state.imageModel === "string" && imageModelInput) {
        imageModelInput.value = state.imageModel;
      }
      if (typeof state.svgModel === "string" && svgModelInput) {
        svgModelInput.value = state.svgModel;
      }
      if (typeof state.baseUrl === "string" && baseUrlInput) {
        baseUrlInput.value = state.baseUrl;
      }
      if (typeof state.samBackend === "string" && samBackend) {
        samBackend.value = state.samBackend;
      }
      if (typeof state.samPrompt === "string" && samPrompt) {
        samPrompt.value = state.samPrompt;
      }
      if (typeof state.samApiKey === "string" && samApiKeyInput) {
        samApiKeyInput.value = state.samApiKey;
      }
      if (typeof state.referencePath === "string" && state.referencePath) {
        uploadedReferencePath = state.referencePath;
      }
      if (typeof state.selectedPresetId === "string" && state.selectedPresetId) {
        selectedPresetId = state.selectedPresetId;
      }
      if (typeof state.referenceUrl === "string" && state.referenceUrl) {
        setReferencePreview(state.referenceUrl);
      }
      if (
        referenceStatus &&
        typeof state.referenceStatus === "string" &&
        state.referenceStatus
      ) {
        referenceStatus.textContent = state.referenceStatus;
      }
    }

    function syncSamApiKeyVisibility() {
      const shouldShow =
        samBackend &&
        (samBackend.value === "fal" || samBackend.value === "roboflow");
      if (samApiKeyGroup) {
        samApiKeyGroup.hidden = !shouldShow;
      }
      if (!shouldShow && samApiKeyInput) {
        samApiKeyInput.value = "";
      }
      saveInputState();
    }

    applyInputState();
    expandMethodTextOnce();
    loadPresetStyles();

    if (samBackend) {
      samBackend.addEventListener("change", syncSamApiKeyVisibility);
      syncSamApiKeyVisibility();
    }

    if (uploadZone && referenceFile) {
      uploadZone.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadZone.classList.add("dragging");
      });
      uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("dragging");
      });
      uploadZone.addEventListener("drop", async (event) => {
        event.preventDefault();
        uploadZone.classList.remove("dragging");
        const file = event.dataTransfer.files[0];
        if (file) {
          const uploadedRef = await uploadReference(
            file,
            confirmBtn,
            referencePreview,
            referenceStatus,
            setReferencePreview
          );
          if (uploadedRef) {
            uploadedReferencePath = uploadedRef.path;
            selectedPresetId = null;
            renderPresetSelection();
            saveInputState();
          }
        }
      });
      referenceFile.addEventListener("change", async () => {
        const file = referenceFile.files[0];
        if (file) {
          const uploadedRef = await uploadReference(
            file,
            confirmBtn,
            referencePreview,
            referenceStatus,
            setReferencePreview
          );
          if (uploadedRef) {
            uploadedReferencePath = uploadedRef.path;
            selectedPresetId = null;
            renderPresetSelection();
            saveInputState();
          }
        }
      });
    }

    if (pdfUploadBtn && pdfFile) {
      pdfUploadBtn.addEventListener("click", () => pdfFile.click());
      pdfFile.addEventListener("change", async () => {
        const file = pdfFile.files[0];
        if (!file) {
          return;
        }
        const methodText = $("methodText");
        confirmBtn.disabled = true;
        if (pdfStatus) {
          pdfStatus.textContent = "Parsing PDF...";
        }
        try {
          const data = await parsePdf(file);
          if (methodText) {
            methodText.value = data.text || "";
            expandMethodTextOnce();
          }
          if (pdfStatus) {
            pdfStatus.textContent =
              `Parsed ${data.page_count || "?"} pages, ${data.char_count || 0} chars from ${data.name || "PDF"}`;
          }
          saveInputState();
        } catch (err) {
          if (pdfStatus) {
            pdfStatus.textContent = err.message || "PDF parse failed";
          }
        } finally {
          confirmBtn.disabled = false;
          pdfFile.value = "";
        }
      });
    }

    const autoSaveFields = [
      methodTextInput,
      $("apiKey"),
      imageModelInput,
      svgModelInput,
      baseUrlInput,
      $("optimizeIterations"),
      samPrompt,
      samApiKeyInput,
    ];
    for (const field of autoSaveFields) {
      if (!field) {
        continue;
      }
      field.addEventListener("input", saveInputState);
      field.addEventListener("change", saveInputState);
    }

    confirmBtn.addEventListener("click", async () => {
      errorMsg.textContent = "";
      const methodText = $("methodText").value.trim();
      if (!methodText) {
        errorMsg.textContent = "Please provide method text.";
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Starting...";

      const payload = {
        method_text: methodText,
        provider: "openrouter",
        api_key: $("apiKey").value.trim() || null,
        base_url: baseUrlInput?.value.trim() || null,
        image_model: imageModelInput?.value || DEFAULT_IMAGE_MODEL,
        svg_model: svgModelInput?.value || DEFAULT_SVG_MODEL,
        optimize_iterations: parseInt($("optimizeIterations").value, 10),
        reference_image_path: uploadedReferencePath,
        sam_backend: $("samBackend").value,
        sam_prompt: $("samPrompt").value.trim() || null,
        sam_api_key: $("samApiKey").value.trim() || null,
      };
      if (payload.sam_backend === "local") {
        payload.sam_api_key = null;
      }
      saveInputState();

      try {
        const response = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Request failed");
        }

        const data = await response.json();
        window.location.href = `/canvas.html?job=${encodeURIComponent(data.job_id)}`;
      } catch (err) {
        errorMsg.textContent = err.message || "Failed to start job";
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm -> Canvas";
      }
    });

    function renderPresetSelection() {
      if (!presetGrid) {
        return;
      }
      for (const card of presetGrid.querySelectorAll(".preset-card")) {
        const cardId = card.dataset.presetId || "";
        card.classList.toggle("active", cardId === selectedPresetId);
      }
    }

    async function loadPresetStyles() {
      if (!presetGrid) {
        return;
      }
      try {
        const response = await fetch("/api/presets");
        if (!response.ok) {
          throw new Error("Failed to load presets");
        }
        const data = await response.json();
        const presets = Array.isArray(data.presets) ? data.presets : [];
        const normalized = presets.map((preset) => {
          const displayName = prettifyPresetName(preset.name || "preset");
          const meta = presetMetaById[preset.id] || {};
          const fallbackDescription = `${displayName} 风格参考图`;
          return {
            ...preset,
            displayName,
            description: meta.description || fallbackDescription,
            order: Number.isFinite(meta.order) ? meta.order : 999,
          };
        });
        normalized.sort((a, b) => a.order - b.order || a.displayName.localeCompare(b.displayName));
        if (!normalized.length) {
          presetGrid.innerHTML = '<div class="hint">未找到可用的预设风格。</div>';
          return;
        }

        presetGrid.innerHTML = "";
        for (const preset of normalized) {
          const card = document.createElement("button");
          card.type = "button";
          card.className = "preset-card";
          card.dataset.presetId = preset.id || "";
          card.title = preset.displayName || "preset";

          const img = document.createElement("img");
          img.className = "preset-image";
          img.src = preset.url || "";
          img.alt = preset.displayName || "preset";
          img.loading = "lazy";

          const titleRow = document.createElement("div");
          titleRow.className = "preset-title-row";

          const name = document.createElement("div");
          name.className = "preset-name";
          name.textContent = preset.displayName || "preset";

          titleRow.appendChild(name);

          const description = document.createElement("div");
          description.className = "preset-description";
          description.textContent = preset.description || "";

          card.appendChild(img);
          card.appendChild(titleRow);
          card.appendChild(description);
          card.addEventListener("click", () => {
            uploadedReferencePath = preset.path || null;
            selectedPresetId = preset.id || null;
            setReferencePreview(preset.url || "");
            if (referenceStatus) {
              referenceStatus.textContent = `已使用预设参考图：${preset.displayName || "预设"}`;
            }
            renderPresetSelection();
            saveInputState();
          });
          presetGrid.appendChild(card);
        }
        renderPresetSelection();
      } catch (_err) {
        presetGrid.innerHTML = '<div class="hint">预设风格暂不可用。</div>';
      }
    }

    function setReferencePreview(url) {
      if (!referencePreview || !url) {
        return;
      }
      referencePreview.src = url;
      referencePreview.classList.add("visible");
      if (referencePreviewLink) {
        referencePreviewLink.href = url;
        referencePreviewLink.classList.add("visible");
      }
    }

    function prettifyPresetName(raw) {
      if (!raw) return "preset";
      let name = String(raw).replace(/\.[^.]+$/, "");
      name = name.replace(/([a-z])([A-Z])/g, "$1 $2");
      name = name.replace(/[-_]+/g, " ");
      name = name.replace(/\s+/g, " ").trim();
      return name || "preset";
    }

    function expandMethodTextOnce() {
      if (!methodTextInput) {
        return;
      }
      const computedStyle = window.getComputedStyle(methodTextInput);
      const minHeight = parseFloat(computedStyle.minHeight) || 0;
      const maxHeight = parseFloat(computedStyle.maxHeight);
      methodTextInput.style.height = "auto";
      let targetHeight = Math.max(minHeight, methodTextInput.scrollHeight);
      if (Number.isFinite(maxHeight) && maxHeight > 0) {
        targetHeight = Math.min(targetHeight, maxHeight);
      }
      if (targetHeight > 0) {
        methodTextInput.style.height = `${targetHeight}px`;
      }
    }
  }

  async function uploadReference(file, confirmBtn, previewEl, statusEl, onPreviewReady) {
    if (!file.type.startsWith("image/")) {
      statusEl.textContent = "仅支持图片文件。";
      return null;
    }

    confirmBtn.disabled = true;
    statusEl.textContent = "正在上传参考图...";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "上传失败");
      }

      const data = await response.json();
      statusEl.textContent = `已使用上传参考图：${data.name}`;
      if (previewEl) {
        if (typeof onPreviewReady === "function") {
          onPreviewReady(data.url || "");
        } else {
          previewEl.src = data.url || "";
          previewEl.classList.add("visible");
        }
      }
      return {
        path: data.path || null,
        url: data.url || "",
        name: data.name || "",
      };
    } catch (err) {
      statusEl.textContent = err.message || "上传失败";
      return null;
    } finally {
      confirmBtn.disabled = false;
    }
  }

  async function parsePdf(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/parse-pdf", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      let message = "PDF parse failed";
      try {
        const payload = await response.json();
        if (payload && payload.detail) {
          message = payload.detail;
        }
      } catch (_err) {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
      throw new Error(message);
    }
    return response.json();
  }

  async function initCanvasPage() {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("job");
    const statusText = $("statusText");
    const jobIdEl = $("jobId");
    const artifactPanel = $("artifactPanel");
    const artifactList = $("artifactList");
    const toggle = $("artifactToggle");
    const logToggle = $("logToggle");
    const backToConfigBtn = $("backToConfigBtn");
    const logPanel = $("logPanel");
    const logBody = $("logBody");
    const iframe = $("svgEditorFrame");
    const fallback = $("svgFallback");
    const fallbackObject = $("fallbackObject");

    if (!jobId) {
      statusText.textContent = "Missing job id";
      return;
    }

    jobIdEl.textContent = jobId;

    toggle.addEventListener("click", () => {
      artifactPanel.classList.toggle("open");
    });

    logToggle.addEventListener("click", () => {
      logPanel.classList.toggle("open");
    });
    if (backToConfigBtn) {
      backToConfigBtn.addEventListener("click", () => {
        window.location.href = "/";
      });
    }

    let svgEditAvailable = false;
    let svgEditPath = null;
    try {
      const configRes = await fetch("/api/config");
      if (configRes.ok) {
        const config = await configRes.json();
        svgEditAvailable = Boolean(config.svgEditAvailable);
        svgEditPath = config.svgEditPath || null;
      }
    } catch (err) {
      svgEditAvailable = false;
    }

    if (svgEditAvailable && svgEditPath) {
      iframe.src = svgEditPath;
    } else {
      fallback.classList.add("active");
      iframe.style.display = "none";
    }

    let svgReady = false;
    let pendingSvgText = null;

    iframe.addEventListener("load", () => {
      svgReady = true;
      if (pendingSvgText) {
        tryLoadSvg(pendingSvgText);
        pendingSvgText = null;
      }
    });

    const stepMap = {
      figure: { step: 1, label: "Figure generated" },
      samed: { step: 2, label: "SAM3 segmentation" },
      icon_raw: { step: 3, label: "Icons extracted" },
      icon_nobg: { step: 3, label: "Icons refined" },
      template_svg: { step: 4, label: "Template SVG ready" },
      final_svg: { step: 5, label: "Final SVG ready" },
    };

    let currentStep = 0;

    const artifacts = new Set();
    const eventSource = new EventSource(`/api/events/${jobId}`);
    let isFinished = false;

    eventSource.addEventListener("artifact", async (event) => {
      const data = JSON.parse(event.data);
      if (!artifacts.has(data.path)) {
        artifacts.add(data.path);
        addArtifactCard(artifactList, data);
      }

      if (data.kind === "template_svg" || data.kind === "final_svg") {
        await loadSvgAsset(data.url);
      }

      if (stepMap[data.kind] && stepMap[data.kind].step > currentStep) {
        currentStep = stepMap[data.kind].step;
        statusText.textContent = `Step ${currentStep}/5 - ${stepMap[data.kind].label}`;
      }
    });

    eventSource.addEventListener("status", (event) => {
      const data = JSON.parse(event.data);
      if (data.state === "started") {
        statusText.textContent = "Running";
      } else if (data.state === "finished") {
        isFinished = true;
        if (typeof data.code === "number" && data.code !== 0) {
          statusText.textContent = `Failed (code ${data.code})`;
        } else {
          statusText.textContent = "Done";
        }
      }
    });

    eventSource.addEventListener("log", (event) => {
      const data = JSON.parse(event.data);
      appendLogLine(logBody, data);
    });

    eventSource.onerror = () => {
      if (isFinished) {
        eventSource.close();
        return;
      }
      statusText.textContent = "Disconnected";
    };

    async function loadSvgAsset(url) {
      let svgText = "";
      try {
        const response = await fetch(url);
        svgText = await response.text();
      } catch (err) {
        return;
      }

      if (svgEditAvailable) {
        if (!svgEditPath) {
          return;
        }
        if (!svgReady) {
          pendingSvgText = svgText;
          return;
        }

        const loaded = tryLoadSvg(svgText);
        if (!loaded) {
          iframe.src = `${svgEditPath}?url=${encodeURIComponent(url)}`;
        }
      } else {
        fallbackObject.data = url;
      }
    }

    function tryLoadSvg(svgText) {
      if (!iframe.contentWindow) {
        return false;
      }

      const win = iframe.contentWindow;
      if (win.svgEditor && typeof win.svgEditor.loadFromString === "function") {
        win.svgEditor.loadFromString(svgText);
        return true;
      }
      if (win.svgCanvas && typeof win.svgCanvas.setSvgString === "function") {
        win.svgCanvas.setSvgString(svgText);
        return true;
      }
      return false;
    }
  }

  function appendLogLine(container, data) {
    const line = `[${data.stream}] ${data.line}`;
    const lines = container.textContent.split("\n").filter(Boolean);
    lines.push(line);
    if (lines.length > 200) {
      lines.splice(0, lines.length - 200);
    }
    container.textContent = lines.join("\n");
    container.scrollTop = container.scrollHeight;
  }

  function addArtifactCard(container, data) {
    const card = document.createElement("a");
    card.className = "artifact-card";
    card.href = data.url;
    card.target = "_blank";
    card.rel = "noreferrer";

    const img = document.createElement("img");
    img.src = data.url;
    img.alt = data.name;
    img.loading = "lazy";

    const meta = document.createElement("div");
    meta.className = "artifact-meta";

    const name = document.createElement("div");
    name.className = "artifact-name";
    name.textContent = data.name;

    const badge = document.createElement("div");
    badge.className = "artifact-badge";
    badge.textContent = formatKind(data.kind);

    meta.appendChild(name);
    meta.appendChild(badge);
    card.appendChild(img);
    card.appendChild(meta);
    container.prepend(card);
  }

  function formatKind(kind) {
    switch (kind) {
      case "figure":
        return "figure";
      case "samed":
        return "samed";
      case "icon_raw":
        return "icon raw";
      case "icon_nobg":
        return "icon no-bg";
      case "template_svg":
        return "template";
      case "final_svg":
        return "final";
      default:
        return "artifact";
    }
  }
})();
