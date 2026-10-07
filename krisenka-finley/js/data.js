/* Contenido editable de la web (datos de ejemplo: sustituir por los reales).
   - Canciones: si se añade "src" con un MP3, se reproduce ese archivo; si no,
     se genera una preescucha con guitarra sintetizada usando key/bpm/chords.
   - Conciertos: fecha en formato ISO local (AAAA-MM-DDTHH:MM). */
window.KF_DATA = {
  tracks: [
    { title: "Cierzo", time: "3:41", note: "Single", bpm: 96, chords: ["G", "D", "Em", "C"], scale: "G" },
    { title: "El siluro del Ebro", time: "4:05", bpm: 112, chords: ["Am", "F", "C", "G"], scale: "A" },
    { title: "Monegros en technicolor", time: "3:28", bpm: 84, chords: ["Em", "C", "G", "D"], scale: "E" },
    { title: "Puente de Piedra", time: "3:55", bpm: 72, chords: ["C", "G", "Am", "F"], scale: "C" },
    { title: "Pilarica eléctrica", time: "3:12", bpm: 124, chords: ["D", "G", "A", "D"], scale: "D" },
    { title: "Cactus en flor", time: "3:37", note: "Acústica", bpm: 90, chords: ["Am", "Em", "F", "G"], scale: "A" }
  ],
  gigs: [
    { date: "2026-08-15T22:00", city: "Lanuza (Huesca)", venue: "Festival en el pantano", status: "past" },
    { date: "2026-09-05T21:30", city: "Jaca", venue: "Palacio de Congresos", status: "past" },
    { date: "2026-10-12T20:00", city: "Zaragoza", venue: "Escenario Plaza del Pilar · Fiestas del Pilar", status: "free" },
    { date: "2026-10-24T21:00", city: "Huesca", venue: "Palacio de Congresos", status: "tickets" },
    { date: "2026-11-07T21:30", city: "Madrid", venue: "Sala La Riviera", status: "last" },
    { date: "2026-11-14T21:00", city: "Barcelona", venue: "Sala Apolo", status: "tickets" },
    { date: "2026-11-28T21:30", city: "Valencia", venue: "Sala Moon", status: "tickets" },
    { date: "2026-12-12T21:00", city: "Bilbao", venue: "Kafe Antzokia", status: "sold" },
    { date: "2027-01-23T20:30", city: "Teruel", venue: "Teatro Marín", status: "tickets" },
    { date: "2027-02-13T21:30", city: "Sevilla", venue: "Sala Custom", status: "tickets" },
    { date: "2027-03-06T22:00", city: "Lisboa (PT)", venue: "Musicbox", status: "tickets" },
    { date: "2027-03-20T21:00", city: "Toulouse (FR)", venue: "Le Bikini", status: "tickets" }
  ],
  ticketsUrl: "#",
  contactEmail: "contacto@krisenkafinley.com"
};
