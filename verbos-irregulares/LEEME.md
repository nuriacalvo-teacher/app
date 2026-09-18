# Irregular Verbs · Fill in the Gaps

App de verbos irregulares (5 módulos de 50 frases, aprobado con el 90 %).

## Qué pide al alumno

Nombre, apellido(s), email, **grupo** (1ESO, 2ESO, 3ESO, 4ESO, 1BTO, 2BTO) y
**código de clase**. Ya no se pide el nombre de la profesora.

## Cómo funciona el código de clase

Todo se configura en un único bloque, arriba del archivo `index.html`
(busca `CONFIGURACION DE ACCESO`):

```js
window.CLASSES = [
  { code: "NCALVO26", teacher: "Nuria Calvo", pin: "nuria123" }
];
window.ALLOW_GUEST_MODE = true;
```

- **`code`**: lo que escribe el alumno al entrar. Sus resultados se guardan
  solo dentro de esa carpeta (`irregular_verbs/NCALVO26/...`), así que nunca
  se mezclan con los de otro grupo.
- **`pin`**: la contraseña del botón ⚙️ *Teacher*. Cada profesor/a solo ve
  los resultados de **su** código.
- Si un compañero quiere usar la app con sus alumnos, se le añade aquí una
  línea con su código y su PIN: su trabajo no te llegará a ti.
- **`ALLOW_GUEST_MODE = true`**: quien no tenga código puede practicar igual.
  Ve sus notas en pantalla y puede imprimirlas, pero **no se guarda nada en
  la nube** ni le llega a nadie. Pon `false` si prefieres que sin código no
  se pueda entrar.

Cambia el PIN antes de publicar la app: está escrito dentro del HTML y
cualquiera que mire el código fuente puede verlo. Sirve para separar el
trabajo de cada clase, no para guardar datos sensibles.

## Resultados

Nombre, apellidos y grupo aparecen en el panel de resultado de cada módulo,
en la corrección, en el informe final y en el panel del profesor (que además
exporta CSV con esas columnas).

## Reglas recomendadas en Firebase

Para que un grupo no pueda leer los datos de otro:

```json
{
  "rules": {
    "irregular_verbs": {
      "$code": {
        ".write": true,
        ".read": true,
        ".indexOn": "email"
      }
    }
  }
}
```

(Con `.read` abierto los datos siguen siendo legibles por quien conozca la
ruta; para cerrarlo del todo haría falta autenticación de Firebase.)
