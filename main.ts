#include < MIDIUSB.h >
#include < Control_Surface.h >

    // Inicia MIDI-USB interface
    USBMIDI_Interface midi;

/* Define nombre para los pines de entrada, donde están los botones */
#define pinA0 A0  /* pedal patch Down */
#define pinA1 A1  /* pedal patch Up */
#define pinA3 A3  /* Scene Change */

/* Variables que recibirán el accionamiento de los botones en los pines de entrada */
int patch_Down;
int patch_Up;
byte Scene = 0; // Cambiado el tipo de variable a byte
int currentScene = 0;

// Crea una instancia de una serie de botones pulsadores bloqueados que envían mensajes MIDI CC cuando se presionan.
CCButtonLatched switches[] {
    { 2, 0x01 }, // Compresor
    { 3, 0x02 }, // Efecto
    { 4, 0x04 }, // EQ
    { 5, 0x06 }, // Modulation
    { 6, 0x07 }, // Delay
    { 7, 0x08 }, // Reverb
    { A3, & Scene }, // Scene
};

PCButton momentaryButtonsPatch[] {
    { A1, & patch_Up }, // Button connected to pin A1 (increase memory patch)
    { A0, & patch_Down }, // Button connected to pin A0 (decrease memory patch)
};

int patch = 0;

// Señal Analogica para el pedal de EXP cc #--
CCPotentiometer potentiometer[] {
    { A2, 0x4C }
};

// La matriz de números de pin para los LED que muestran los estados de los botones.
const pin_t ledPins[] = { 8, 9, 10, 11, 12, A4, A6 };

// Obtener la longitud de una matriz
template < class T, size_t N > constexpr size_t length(T(&)[N]) { return N; }

static_assert(length(switches) == length(ledPins), "Error: requires the same number of switches as LEDs");

void setup() {
    Control_Surface.begin(); // Inicia libreria Control Surface
    for (auto pin : ledPins) // Define pinMode output para los LEDs
    pinMode(pin, OUTPUT);

    Serial.begin(31250); // Inicia comunicación serial y define la velocidad
}

void loop() {
    Control_Surface.loop(); // Update Control Surface

    // Loop todos los botones y LED
    for (size_t i = 0; i < length(switches); ++i) {
        // Actualiza los estados del LED para reflejar los estados del switch
        digitalWrite(ledPins[i], switches[i].getState() ? LOW : HIGH);
    }

    /* Variables que reciben el accionamiento de los botones en los pines de entrada */
    patch_Down = digitalRead(pinA0);
    patch_Up = digitalRead(pinA1);
    Scene = digitalRead(pinA3); // Asegúrate de que Scene sea actualizado correctamente

    /*/////////////////// SCENE CTRL ///////////////////*/
    if (Scene == LOW) {
        changeScene();
        MidiUSB.flush();  // Enviar mensaje por USB inmediatamente
        delay(400); // Tiempo hasta poder enviar el comando nuevamente
    }

    /*/////////////////// PATCH UP ///////////////////*/
    if (patch_Up == LOW) { // Si el pedal Patch Up es presionado
        increasePatch();
        MidiUSB.flush();  // Enviar mensaje por USB inmediatamente
        delay(400); // Tiempo hasta poder enviar el comando nuevamente
    }

    /*/////////////////// PATCH DOWN ///////////////////*/
    if (patch_Down == LOW) { // Si el pedal Patch Down es presionado
        decreasePatch();
        MidiUSB.flush();  // Enviar mensaje por USB inmediatamente
        delay(400); // Tiempo hasta poder enviar el comando nuevamente
    }
}

void changeScene() {
    currentScene = (currentScene + 1) % 3;  // Incrementa Scene y reinicia a 0 si alcanza 2
    controlScene(0, 79, currentScene);  // Usar Scene como el valor de program para Scene
}

void controlScene(byte channel, byte program, byte value) {
    midiEventPacket_t midiEvent = { 0x0B, 0xB0 | channel, program, value };
    MidiUSB.sendMIDI(midiEvent);  // Enviar por USB
}

void increasePatch() {
    if (patch < 127) {
        patch = patch + 1;
        programChange(0, patch);
    }
}

void decreasePatch() {
    if (patch > 0) { // Ajustar el límite inferior a 1
        patch = patch - 1;
        programChange(0, patch);
    }
}

void programChange(byte channel, byte patch) {
    midiEventPacket_t midiEvent = { 0x0C, 0xC0 | channel, patch }; // Usar el valor correcto del patch
    MidiUSB.sendMIDI(midiEvent);  // Enviar por USB
}
