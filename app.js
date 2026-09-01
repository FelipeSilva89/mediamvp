const slides = document.querySelectorAll(".slide");
const progress = document.getElementById("progress");

let currentSlide = 0;

// Tempo de cada conteúdo em milissegundos
const SLIDE_DURATION = 10000;

function showSlide(index) {

    slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === index);
    });

    progress.style.transition = "none";
    progress.style.width = "0%";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {

            progress.style.transition = `width ${SLIDE_DURATION}ms linear`;
            progress.style.width = "100%";

        });
    });
}

function nextSlide() {

    currentSlide++;

    if (currentSlide >= slides.length) {
        currentSlide = 0;
    }

    showSlide(currentSlide);
}

showSlide(currentSlide);

setInterval(nextSlide, SLIDE_DURATION);