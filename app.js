function startProcessing() {

  let percent = 0;
  const el = document.getElementById("percent");
  const ring = document.getElementById("ring");

  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");

  step1.style.color = "#00ffc6";

  let interval = setInterval(() => {

    percent++;
    el.innerText = percent + "%";

    ring.style.background =
      `conic-gradient(#00ffc6 ${percent}%, #123 ${percent}%)`;

    if (percent === 30) {
      step1.style.color = "#7fa6b3";
      step2.style.color = "#00ffc6";
    }

    if (percent === 70) {
      step2.style.color = "#7fa6b3";
      step3.style.color = "#00ffc6";
    }

    if (percent >= 86) {
      clearInterval(interval);
    }

  }, 20);
}