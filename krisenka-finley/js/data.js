/* Contenido editable de la web.
   - song: la canción que suena en la web, con los datos de ritmo precalculados
     (24 bandas de frecuencia y un pulso por fotograma, a 30 fotogramas/segundo).
   - albums: discos. Cada vinilo abre su caja de CD con la portada y el enlace.
     Las portadas de los 4 álbumes son provisionales: sustituir los archivos de
     assets/portadas/ por las originales (mismo nombre).
   - gigs: conciertos. Formato: { date: "2027-03-20T21:00", city: "Zaragoza",
     venue: "Sala López", url: "https://..." }. Mientras esté vacío se muestra
     el aviso de «cocinando un disco nuevo». */
window.KF_DATA = {
  song: {
    title: "Back Again",
    src: "assets/back-again.mp3",
    cover: "assets/back-again-cover.jpg",
    bands: "assets/back-again-bands.txt",
    hits: "assets/back-again-hits.txt",
    fps: 30
  },
  albums: [
    { title: "Wasteland", kind: "Álbum", cover: "assets/portadas/wasteland.jpg", url: "https://krisenkafinley.bandcamp.com" },
    { title: "Hello Freedom", kind: "Álbum", cover: "assets/portadas/hello-freedom.jpg", url: "https://krisenkafinley.bandcamp.com" },
    { title: "No está en venta", kind: "Álbum", cover: "assets/portadas/no-esta-en-venta.jpg", url: "https://krisenkafinley.bandcamp.com" },
    { title: "10", kind: "Álbum", cover: "assets/portadas/10.jpg", url: "https://krisenkafinley.bandcamp.com" },
    { title: "Inner Peace", kind: "Single · 2020", cover: "assets/portadas/inner-peace.jpg", url: "https://krisenkafinley.bandcamp.com/track/inner-peace",
      note: "Primer single de su quinto disco: rock sureño y blues con música del mundo y de la India." }
  ],
  gigs: [],
  links: [
    { name: "Bandcamp", url: "https://krisenkafinley.bandcamp.com", note: "Discos y descargas" },
    { name: "YouTube", url: "https://www.youtube.com/krisenka", note: "Vídeos y directos" },
    { name: "LinkedIn", url: "https://www.linkedin.com/in/krisenkafinley/", note: "Contratación y producción" }
  ]
};
