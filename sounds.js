

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


function clampVolume(value) {
    return Math.max(
        0.0,
        Math.min(1.0, value)
    );
}

function applyMasterVolumeToSound(audioElement, baseVolume) {
    if (!audioElement) {
        return;
    }

    if (baseVolume === undefined) {
        baseVolume = 1.0;
    }

    audioElement.volume =
        clampVolume(baseVolume * masterAudioVolume);
}

function setAllGameSoundsVolume(volume) {
    masterAudioVolume = clampVolume(volume);

    for (var soundId in audioBaseVolumes) {
        var sound =
            document.getElementById(soundId);

        if (sound) {
            applyMasterVolumeToSound(
                sound,
                audioBaseVolumes[soundId]
            );
        }
    }
    /*
        dogHappySound is loaded with a different method, so I have to handle it separately.
    */
    if (typeof dogHappySound !== "undefined" && dogHappySound) {
        applyMasterVolumeToSound(
            dogHappySound,
            audioBaseVolumes.dogHappySound
        );
    }
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
        SUPER IMPORTANT: I update the background music button as well, 
        because with global mute the music is no longer audible.
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

    var sound =
        document.getElementById("ballThrowSound");

    if (
        !startGlobalAudioEnabled ||
        !sound ||
        sound.muted
    ) {
        return;
    }

    applyMasterVolumeToSound(
        sound,
        audioBaseVolumes.ballThrowSound
    );

    sound.pause();

    try {
        sound.currentTime = 0.1;
    } catch (error) {
        console.log("Could not reset ball throw sound:", error);
    }

    sound.play().catch(function(error) {
        console.log("Ball throw sound blocked:", error);
    });
}

///////////////

function warmUpBallThrowSound() {
    if (!ballThrowSound) {
        return;
    }

    var previousVolume = ballThrowSound.volume;

    /*
        I do it muted and stop it immediately.
        This is to load/decode the audio file before the actual throw.
    */
    ballThrowSound.volume = 0.0;
    ballThrowSound.currentTime = 0.0;

    var playPromise = ballThrowSound.play();

    if (playPromise) {
        playPromise.then(function () {
            ballThrowSound.pause();
            ballThrowSound.currentTime = 0.0;
            ballThrowSound.volume = previousVolume;
        }).catch(function () {
            ballThrowSound.volume = previousVolume;
        });
    } else {
        ballThrowSound.pause();
        ballThrowSound.currentTime = 0.0;
        ballThrowSound.volume = previousVolume;
    }
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

        windSound.volume = volume * masterAudioVolume;

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

    if (
        startGlobalAudioEnabled &&
        !globalAudioMuted &&
        dogHappySound
    ) {
        applyMasterVolumeToSound(
            dogHappySound,
            audioBaseVolumes.dogHappySound
        );

        dogHappySound.pause();

        try {
            dogHappySound.currentTime = 0;
        } catch (error) {
            console.log("Could not reset dog happy sound:", error);
        }

        dogHappySound.play().catch(function(error) {
            console.log("Dog happy sound blocked:", error);
        });
    }
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

    if (
        !startGlobalAudioEnabled ||
        !barkSound ||
        barkSound.muted
    ) {
        return;
    }

    applyMasterVolumeToSound(
        barkSound,
        audioBaseVolumes.dogBarkSound
    );



    // reproduce from the beginning every time
    barkSound.pause();
    barkSound.currentTime = 0;
    //barkSound.volume = 0.8;

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
function playWooshFrisbeeSound_old() {
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

function playWooshFrisbeeSound() {
    if (globalAudioMuted) {
        return;
    }

    var sound =
        document.getElementById("wooshFrisbeeSound");

    if (
        !startGlobalAudioEnabled ||
        !sound ||
        sound.muted
    ) {
        return;
    }

    applyMasterVolumeToSound(
        sound,
        audioBaseVolumes.wooshFrisbeeSound
    );

    sound.pause();

    try {
        sound.currentTime = 0;
    } catch (error) {
        console.log("Could not reset frisbee sound:", error);
    }

    sound.play().catch(function(error) {
        console.log("Frisbee sound blocked:", error);
    });
}
//////////////////////////////////////////////
function playGlassBreakingSound() {
    if (typeof globalAudioEnabled !== "undefined" && !globalAudioEnabled) {
        return;
    }

    var sound =
        document.getElementById("glassBreakingSound");

    if (!sound) {
        console.warn("glassBreakingSound element not found");
        return;
    }

    /*
        Restart the sound from the beginning every time
        the teapot breaks.
    */
    sound.currentTime = 0.0;
    sound.volume = 0.7;

    sound.play().catch(function (error) {
        console.warn("Glass breaking sound could not be played:", error);
    });
}