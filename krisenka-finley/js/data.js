/* ================================================================
   CONTENIDO DE LA WEB: aquí se cambia la música, los discos,
   los conciertos y los enlaces. No hace falta tocar nada más.

   Cómo poner una canción nueva:
   1. Sube el MP3 a la carpeta «musica» (en GitHub: entra en la carpeta,
      «Add file» → «Upload files»). Mejor sin espacios ni tildes en el
      nombre del archivo, por ejemplo: musica/hello-freedom-01.mp3
   2. Escribe aquí su título y su archivo, entre comillas, con una coma
      al final de cada línea como en los ejemplos.
   La web se mueve al ritmo de cualquier canción que suene.
   ================================================================ */
window.KF_DATA = {

  /* Canción que suena al entrar en la web («Entrar con sonido»).
     Para cambiarla, cambia «titulo», «archivo» y «portada».
     «bandas» y «golpes» son el ritmo precalculado de Back Again: si pones
     otra canción, bórralos y la web calculará el ritmo mientras suena. */
  cancionPrincipal: {
    titulo: "Back Again",
    archivo: "musica/back-again.mp3",
    portada: "musica/back-again.jpg",
    bandas: "musica/back-again-bandas.txt",
    golpes: "musica/back-again-golpes.txt"
  },

  /* Discos: cada uno es un vinilo que, al pulsarlo, abre su caja de CD
     con la lista de canciones.
     - portada: imagen cuadrada (mejor JPG de 600×600) en assets/portadas/
     - enlace: dónde comprarlo o escucharlo entero
     - canciones: lista de { titulo, archivo }. Si una canción no tiene
       «archivo», aparece en la lista pero no se puede escuchar.
     Ejemplo de canciones:
       canciones: [
         { titulo: "Primera canción", archivo: "musica/wasteland-01.mp3" },
         { titulo: "Segunda canción", archivo: "musica/wasteland-02.mp3" },
         { titulo: "Tercera canción" }
       ]
  */
  discos: [
    {
      titulo: "Wasteland",
      tipo: "Álbum",
      portada: "assets/portadas/wasteland.jpg",
      enlace: "https://krisenkafinley.bandcamp.com",
      canciones: []
    },
    {
      titulo: "Hello Freedom",
      tipo: "Álbum",
      portada: "assets/portadas/hello-freedom.jpg",
      enlace: "https://krisenkafinley.bandcamp.com",
      canciones: []
    },
    {
      titulo: "No está en venta",
      tipo: "Álbum",
      portada: "assets/portadas/no-esta-en-venta.jpg",
      enlace: "https://krisenkafinley.bandcamp.com",
      canciones: []
    },
    {
      titulo: "10",
      tipo: "Álbum",
      portada: "assets/portadas/10.jpg",
      enlace: "https://krisenkafinley.bandcamp.com",
      canciones: []
    },
    {
      titulo: "Inner Peace",
      tipo: "Single · 2020",
      portada: "assets/portadas/inner-peace.jpg",
      enlace: "https://krisenkafinley.bandcamp.com/track/inner-peace",
      nota: "Primer single de su quinto disco: rock sureño y blues con música del mundo y de la India.",
      canciones: [
        { titulo: "Inner Peace" }
      ]
    }
  ],

  /* Conciertos. Ejemplo:
       { fecha: "2027-03-20T21:00", ciudad: "Zaragoza", sala: "Sala López", entradas: "https://..." },
     Mientras la lista esté vacía se muestra «Cocinando un disco nuevo». */
  conciertos: [],

  /* Enlaces del apartado Contacto */
  enlaces: [
    { nombre: "Bandcamp", url: "https://krisenkafinley.bandcamp.com", nota: "Discos y descargas" },
    { nombre: "YouTube", url: "https://www.youtube.com/krisenka", nota: "Vídeos y directos" },
    { nombre: "LinkedIn", url: "https://www.linkedin.com/in/krisenkafinley/", nota: "Contratación y producción" }
  ]
};
