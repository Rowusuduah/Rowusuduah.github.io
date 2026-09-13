"use strict";

const printButton = document.getElementById("print-resume");

if (printButton) {
  printButton.hidden = false;
  printButton.addEventListener("click", () => window.print());
}
