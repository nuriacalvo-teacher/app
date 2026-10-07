/* ================================================================
   CONTENIDO DE LA WEB: aquí se cambia la música, los discos,
   los conciertos y los enlaces. No hace falta tocar nada más.

   Cómo poner una canción que se pueda escuchar:
   1. Sube el MP3 a la carpeta «musica» (en GitHub: entra en la carpeta,
      «Add file» → «Upload files»). Mejor sin espacios ni tildes en el
      nombre del archivo, por ejemplo: musica/hello-freedom-02.mp3
   2. Añade a la canción su archivo, así:
        { titulo: "Hello Freedom", archivo: "musica/hello-freedom-02.mp3" },
   Cuidado con las comillas y con la coma al final de cada línea.
   ================================================================ */
window.KF_DATA = {

  /* Canción que suena al entrar en la web («Entrar con sonido») */
  cancionPrincipal: {
    titulo: "Back Again",
    archivo: "musica/back-again.mp3",
    portada: "musica/back-again.jpg"
  },

  /* Dónde escucharla. Sustituye cada enlace por la página de la artista
     en esa plataforma (ahora algunos llevan a la búsqueda de su nombre).
     Para quitar una plataforma, borra su línea. */
  plataformas: [
    { nombre: "Spotify", url: "https://open.spotify.com/search/Krisenka%20Finley" },
    { nombre: "Apple Music", url: "https://music.apple.com/es/search?term=Krisenka%20Finley" },
    { nombre: "YouTube", url: "https://www.youtube.com/krisenka" },
    { nombre: "Bandcamp", url: "https://krisenkafinley.bandcamp.com" },
    { nombre: "Amazon Music", url: "https://music.amazon.es/search/Krisenka%20Finley" },
    { nombre: "Deezer", url: "https://www.deezer.com/search/Krisenka%20Finley" }
  ],

  /* DISCOS. Cada uno es un vinilo que, al pulsarlo, abre su caja de CD.
     - año, sello: aparecen bajo el título
     - portada: imagen cuadrada (JPG de unos 600×600) en assets/portadas/.
       Si no tiene portada, la web le dibuja una de colores.
     - enlace: dónde escuchar el disco entero (opcional)
     - canciones: { titulo, duracion, archivo }. «duracion» y «archivo»
       son opcionales; sin archivo, la canción sale en la lista sin botón.

     Para añadir un disco nuevo, copia uno entero (de { a },) y cámbialo.
     Para canciones sueltas, crea un recopilatorio por año, por ejemplo:
       {
         titulo: "Canciones sueltas 2026",
         tipo: "Recopilatorio",
         año: 2026,
         canciones: [
           { titulo: "Back Again", archivo: "musica/back-again.mp3" }
         ]
       },
     Los discos se muestran del más nuevo al más antiguo. */
  discos: [
    {
      titulo: "Wasteland",
      tipo: "Álbum",
      año: 2004,
      sello: "Producciones Sin/Con Pasiones",
      portada: "assets/portadas/wasteland.jpg",
      nota: "Incluye el videoclip de «Whiskey in the Jar».",
      canciones: [
        { titulo: "Three Lovers", duracion: "3:34" },
        { titulo: "Wasteland", duracion: "3:30" },
        { titulo: "Just Let It Die", duracion: "4:21" },
        { titulo: "Dust in the Wind", duracion: "3:17" },
        { titulo: "Norwegian Wood", duracion: "2:24" },
        { titulo: "Little Sister", duracion: "3:53" },
        { titulo: "Whiskey in the Jar", duracion: "3:05" },
        { titulo: "Mother Nature's Son", duracion: "3:12" },
        { titulo: "You Don't Deserve Me", duracion: "3:43" },
        { titulo: "Strange Fruit", duracion: "3:03" },
        { titulo: "Jackson", duracion: "3:16" },
        { titulo: "Spanish Lullaby", duracion: "2:58" }
      ]
    },
    {
      titulo: "Hello Freedom",
      tipo: "Álbum",
      año: 2004,
      sello: "Kikos",
      portada: "assets/portadas/hello-freedom.jpg",
      canciones: [
        { titulo: "Presentación" },
        { titulo: "Hello Freedom" },
        { titulo: "The War Correspondent" },
        { titulo: "Keep On Hanging On" },
        { titulo: "The Old Lady in Her Armchair" },
        { titulo: "Graven in My Heart" },
        { titulo: "Fields of Athenry" },
        { titulo: "The Black Island" },
        { titulo: "Never" },
        { titulo: "I'm So in Love with You" },
        { titulo: "Shifty Mind" },
        { titulo: "Now Is the Time" }
      ]
    },
    {
      titulo: "No está en venta",
      tipo: "Álbum",
      año: 2006,
      sello: "Estudios Kiko's",
      portada: "assets/portadas/no-esta-en-venta.jpg",
      canciones: [
        { titulo: "No está en venta", duracion: "3:35" },
        { titulo: "Only Your Best Friend", duracion: "3:38" },
        { titulo: "A Loving Song", duracion: "3:19" },
        { titulo: "Flashing Romance", duracion: "3:15" },
        { titulo: "El socorrista", duracion: "3:00" },
        { titulo: "Release the Pressure", duracion: "4:04" },
        { titulo: "Far Too Late", duracion: "3:51" },
        { titulo: "I Love Rock and Roll", duracion: "2:30" },
        { titulo: "The Beggar Child", duracion: "3:15" },
        { titulo: "Golden Wings", duracion: "5:00" },
        { titulo: "Highway to Hell", duracion: "3:06" },
        { titulo: "We Want More", duracion: "3:43" }
      ]
    },
    {
      titulo: "10",
      tipo: "Álbum",
      año: 2010,
      sello: "Edición propia",
      portada: "assets/portadas/10.jpg",
      canciones: [
        { titulo: "Tribal World" },
        { titulo: "Add Me" },
        { titulo: "You" },
        { titulo: "Un nuevo amanecer" },
        { titulo: "You Take Me" },
        { titulo: "Gente de corazón" },
        { titulo: "If You Don't Let Me Down" },
        { titulo: "Somontano" },
        { titulo: "Sparrow" },
        { titulo: "A mi madre" },
        { titulo: "Highway to Hell", duracion: "3:06" },
        { titulo: "We Want More", duracion: "3:43" }
      ]
    },
    {
      titulo: "Inner Peace",
      tipo: "Single",
      año: 2020,
      portada: "assets/portadas/inner-peace.jpg",
      enlace: "https://krisenkafinley.bandcamp.com/track/inner-peace",
      nota: "Primer single de su quinto disco: rock sureño y blues con música del mundo y de la India.",
      canciones: [
        { titulo: "Inner Peace", duracion: "4:07" }
      ]
    }
  ],

  /* Conciertos. Ejemplo:
       { fecha: "2027-03-20T21:00", ciudad: "Zaragoza", sala: "Sala López", entradas: "https://..." },
     Mientras la lista esté vacía se muestra «Cocinando un disco nuevo». */
  conciertos: [],

  /* Otros enlaces del apartado Contacto */
  enlaces: [
    { nombre: "Facebook", url: "https://facebook.com/krisenkafinley", nota: "Noticias" },
    { nombre: "LinkedIn", url: "https://www.linkedin.com/in/krisenkafinley/", nota: "Contratación y producción" }
  ]
};
