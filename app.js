function startProcessing() {
  let percent = 0;

  const el = document.getElementById("percent");
  const ring = document.getElementById("ring");
  const documentSheet = document.getElementById("documentSheet");

  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");

  // RESET STATE
  clearInterval(window.colmariInterval);

  percent = 0;
  el.innerText = "0%";

  step1.style.color = "#00ffc6";
  step2.style.color = "#7fa6b3";
  step3.style.color = "#7fa6b3";

  // RESTART ANIMATION CLEANLY
  documentSheet.classList.remove("move-in");
  void documentSheet.offsetWidth;
  documentSheet.classList.add("move-in");

  // 🔥 DYNAMIC SPEED FUNCTION (REALISTIC)
  function getSpeed(p) {
    if (p < 30) return 12;      // fast start
    if (p < 70) return 22;      // slower mid
    return 35;                  // slow finish
  }

  function updateProgress() {
    // small randomness = realism
    const increment = Math.random() * 1.5 + 0.5;
    percent += increment;

    if (percent > 100) percent = 100;

    const display = Math.floor(percent);
    el.innerText = display + "%";

    // SMOOTH RING
    ring.style.background =
      `conic-gradient(#00ffc6 ${display}%, rgba(19, 44, 61, 0.95) ${display}%)`;

    // STEP TRANSITIONS
    if (display >= 30 && display < 70) {
      step1.style.color = "#7fa6b3";
      step2.style.color = "#00ffc6";
    }

    if (display >= 70) {
      step2.style.color = "#7fa6b3";
      step3.style.color = "#00ffc6";
    }

    // FINISH
    if (display >= 100) {
      clearInterval(window.colmariInterval);

      // subtle finish pulse
      ring.style.boxShadow = "0 0 45px rgba(0,255,198,0.6)";

      setTimeout(() => {
        ring.style.boxShadow = "0 0 28px rgba(0,255,198,0.3)";
      }, 600);

      return;
    }

    // NEXT FRAME (variable timing)
    window.colmariInterval = setTimeout(updateProgress, getSpeed(display));
  }

  updateProgress();
}