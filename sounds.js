function startBackgroundMusic() {
    var music = document.getElementById("backgroundMusic");
    if (!music) return;

    music.volume = 0.01;

    music.play().catch(function(error) {
        console.log("Music play blocked:", error);
    });
}

function stopBackgroundMusic() {
    var music = document.getElementById("backgroundMusic");
    if (!music) return;

    music.pause();
}


function toggleBackgroundMusic() {
    if (!backgroundMusic || !musicButton || !musicIcon) {
        return;
    }

    if (backgroundMusic.paused) {
        backgroundMusic.play().catch(function(error) {
            console.log("Music play blocked:", error);
        });

        // Ora la musica è accesa: mostro l'icona per spegnerla
        musicIcon.src = path_icon_music_off
        musicButton.title = "Music ON";
        musicButton.classList.add("music-on");
    } else {
        backgroundMusic.pause();

        // Ora la musica è spenta: mostro l'icona per accenderla
        musicIcon.src = path_icon_music_on;
        musicButton.title = "Music OFF";
        musicButton.classList.remove("music-on");
    }
}


function playBallThrowSound() {
    var sound = document.getElementById("ballThrowSound");

    if (!sound) return;

    sound.currentTime = 0;
    sound.volume = 1.0;

    sound.play().catch(function(error) {
        console.log("Ball throw sound blocked:", error);
    });
}

function updateWindSound(windValue) {
    var windSound = document.getElementById("windSound");
    if (!windSound) return;

    var wind = parseFloat(windValue);

    // cambia questo se il tuo slider ha max diverso
    var maxWind = 0.5;

    if (wind > 0.05) {
        var volume = Math.min(wind / maxWind, 1.0);

        windSound.volume = volume * 1.0; // volume massimo al 45%

        if (windSound.paused) {
            windSound.play().catch(function(error) {
                console.log("Wind sound blocked:", error);
            });
        }
    } else {
        windSound.pause();
        windSound.currentTime = 0;
    }
}

function playDogBarkSound() {
    var barkSound = document.getElementById("dogBarkSound");

    if (!barkSound) {
        console.warn("dogBarkSound not found");
        return;
    }

    // Permette di riprodurlo da capo a ogni nuova chiamata
    barkSound.pause();
    barkSound.currentTime = 0;
    barkSound.volume = 0.8;

    barkSound.play().catch(function(error) {
        console.log("Dog bark sound could not be played:", error);
    });
}

function startDogBreathSound() {
    var breathSound = document.getElementById("dogBreathSound");

    if (!breathSound) {
        console.log("dogBreathSound element not found");
        return;
    }

    if (!breathSound.paused) {
        return;
    }

    breathSound.volume = 0.8;

    breathSound.play().catch(function (error) {
        console.log("Dog breath play error:", error);
    });
}

function stopDogBreathSound() {
    var breathSound = document.getElementById("dogBreathSound");

    if (!breathSound) return;

    breathSound.pause();
    breathSound.currentTime = 0;
}