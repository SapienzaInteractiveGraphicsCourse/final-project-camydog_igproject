function getCurrentBackgroundMusic() {
    if (currentScene === "park") {

        if (isNight) {
            return document.getElementById("parkNightBackgroundMusic");
        }
        return document.getElementById("parkBackgroundMusic");
    }

    return document.getElementById("backgroundMusic");
}

function stopEveryBackgroundMusic() {
    var homeMusic = document.getElementById("backgroundMusic");
    var parkMusic = document.getElementById("parkBackgroundMusic");
    var parkNightMusic = document.getElementById("parkNightBackgroundMusic");

    if (homeMusic) {
        homeMusic.pause();
    }

    if (parkMusic) {
        parkMusic.pause();
    }
    if (parkNightMusic) {
        parkNightMusic.pause();
    }
}


function startBackgroundMusic() {
    var music = getCurrentBackgroundMusic();

    if (!music) return;

    stopEveryBackgroundMusic();

    var volumeSlider = document.getElementById("MusicVolume");

    if (volumeSlider) {
        music.volume = parseFloat(volumeSlider.value);
    } else {
        music.volume = 0.10;
    }

    music.play().catch(function(error) {
        console.log("Music play blocked:", error);
    });
}
function stopBackgroundMusic() {
    stopEveryBackgroundMusic();
}


function toggleBackgroundMusic() {
    if (!musicButton || !musicIcon) {
        return;
    }

    var currentMusic = getCurrentBackgroundMusic();

    if (!currentMusic) return;


    if (globalAudioMuted) {
        showGameMessage(
            "Turn global audio back on before starting the background music :)",
            2900
        );

        updateBackgroundMusicButtonVisualState();
        return;
    }

    if (currentMusic.paused) {
        startBackgroundMusic();
    } else {
        stopBackgroundMusic();
    }

    updateBackgroundMusicButtonVisualState();
}

function isAnyBackgroundMusicPlaying() {
    var homeMusic = document.getElementById("backgroundMusic");
    var parkMusic = document.getElementById("parkBackgroundMusic");
    var parkNightMusic = document.getElementById("parkNightBackgroundMusic");

    return (
        (homeMusic && !homeMusic.paused) ||
        (parkMusic && !parkMusic.paused) ||
        (parkNightMusic && !parkNightMusic.paused)
    );
}


function refreshBackgroundMusicAfterSceneChange() {
    var wasPlaying = isAnyBackgroundMusicPlaying();

    stopEveryBackgroundMusic();

    if (wasPlaying) {
        startBackgroundMusic();

        
    }
    updateBackgroundMusicButtonVisualState();
}

///////////////////////////////////////////
function updateMusicSliderStyle() {
    var slider = document.getElementById("MusicVolume");
    var valueText = document.getElementById("MusicVolumeValue");

    if (!slider) return;

    var percent = Math.round(parseFloat(slider.value) * 100);

    slider.style.setProperty("--music-progress", percent + "%");

    if (valueText) {
        valueText.textContent = percent + "%";
    }
}
//////////////////////////////////////////////
function setGlobalAudioMuted(muted) {
    globalAudioMuted = muted;

    var audioElements = document.querySelectorAll("audio");

    for (var i = 0; i < audioElements.length; i++) {
        audioElements[i].muted = muted;
    }

    updateGlobalAudioButton();

    /*
        Importantissimo:
        aggiorno anche il bottone della background music,
        perché col mute globale la musica non è più udibile.
    */
    updateBackgroundMusicButtonVisualState();
}


function toggleGlobalAudioMute() {
    setGlobalAudioMuted(!globalAudioMuted);
}


function updateGlobalAudioButton() {
    var globalAudioButton = document.getElementById("ButtonGlobalAudio");
    var globalAudioIcon = document.getElementById("GlobalAudioIcon");

    if (!globalAudioButton || !globalAudioIcon) {
        return;
    }

    if (globalAudioMuted) {
        globalAudioIcon.src = path_icon_audio_on;
        globalAudioButton.title = "Audio ON";
        globalAudioButton.classList.add("audio-muted");
    } else {
        globalAudioIcon.src = path_icon_audio_off;
        globalAudioButton.title = "Mute all audio";
        globalAudioButton.classList.remove("audio-muted");
    }
}

function updateBackgroundMusicButtonVisualState() {
    if (!musicButton || !musicIcon) {
        return;
    }

    var currentMusic = getCurrentBackgroundMusic();

    var musicIsPlaying =
        currentMusic &&
        !currentMusic.paused;

    var musicIsAudible =
        musicIsPlaying &&
        !globalAudioMuted;

    if (musicIsAudible) {
        /*
            Music is playing and audible.
            I have to show the icon to turn it off, so I show the "music off" icon.
        */
        musicIcon.src = path_icon_music_off;
        musicButton.title = "Turn background music off";
        musicButton.classList.add("music-on");
    } else {
        /*
            Music is not audible.
            It could be either turned off or muted globally.
        */
        musicIcon.src = path_icon_music_on;
        musicButton.classList.remove("music-on");

        if (globalAudioMuted && musicIsPlaying) {
            musicButton.title = "Global audio is muted";
        } else {
            musicButton.title = "Turn background music on";
        }
    }
}
//////////////////////////////////////

function playBallThrowSound() {
    if (globalAudioMuted) {
        return;
    }
    var sound = document.getElementById("ballThrowSound");

    if (!sound) return;

    sound.currentTime = 0;
    sound.volume = 1.0;

    sound.play().catch(function(error) {
        console.log("Ball throw sound blocked:", error);
    });
}
///////////////////////////////////////////////////////
function updateWindSound(windValue) {
    var windSound = document.getElementById("windSound");
    if (!windSound) return;

    var wind = parseFloat(windValue);

    if (globalAudioMuted) {
        showGameMessage(
            "Turn global audio back on before listening to the wind sound :)",
            2900
        );
    }
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
////////////////////////////////////
function playDogHappySound() {
     if (globalAudioMuted) {
        return;
    }

    if (!dogHappySound) return;

    dogHappySound.currentTime = 0;

    dogHappySound.play().catch(function(error) {
        console.log("Dog happy sound could not be played:", error);
    });
}
////////////////////////////////////////
function playPouringFoodSound() {
    if (!pouringFoodSound) return;

    pouringFoodSound.currentTime = 0;

    pouringFoodSound.play().catch(function(error) {
        console.log("Pouring food sound could not be played:", error);
    });
}
///////////////////////////////////////////////
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

//////////////////////////////////////////
function playWooshFrisbeeSound() {
    if (!wooshFrisbeeSound) {
        wooshFrisbeeSound = document.getElementById("wooshFrisbeeSound");
    }

    if (!wooshFrisbeeSound) {
        console.log("wooshFrisbeeSound not found");
        return;
    }
    
    var startTime = 0.3;

    wooshFrisbeeSound.pause();
    wooshFrisbeeSound.currentTime = startTime;
    wooshFrisbeeSound.volume = 0.6;

    wooshFrisbeeSound.play().catch(function(error) {
        console.log("Frisbee woosh sound blocked:", error);
    });
}
//////////////////////////////////////////////