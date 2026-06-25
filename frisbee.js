function getFrisbeeModelMatrix() {
    var m = mat4();

    /*
        Primo test: appoggiato sul prato.
        Il top del prato è circa -2.45, quindi metto il frisbee poco sopra.
    */

    //per stare per  terra -2.4
    m = mult(m, translate(0.8, 1.0, 5.0));

    /*
        Se il modello nasce verticale, questa rotazione lo mette piatto.
        Se invece appare già piatto ma ruotato male, togli questa riga.
    */
   m = mult(m, rotate(90, [0, 1, 0]));

    /*
        Scala iniziale.
        Se è enorme, prova 0.1.
        Se è microscopico, prova 1.0 o 2.0.
    */
    m = mult(m, scalem(0.5, 0.5, 0.5));

    return m;
}

function startFrisbeeThrowSequence() {
    if (currentScene !== "park") {
        return;
    }

    if (frisbeeFlying || frisbeePreparingThrow) {
        return;
    }

    frisbeePreparingThrow = true;
    frisbeeAttachedToHand = true;

    setTimeout(function () {
        launchFrisbee();
    }, 250);
}