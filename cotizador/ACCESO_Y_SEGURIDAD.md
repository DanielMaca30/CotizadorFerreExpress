# Acceso y seguridad — léelo antes de compartir el enlace

## 1. Poner la clave de la empresa

En la carpeta `cotizador`, en el archivo `.env` (el mismo de las credenciales de
Supabase), agrega una línea:

```
VITE_APP_PASSWORD=laclavequeustedesescojan
```

Después vuelve a publicar la app. Al entrar pedirá esa clave una sola vez por
computador; queda recordada hasta que se borren los datos del navegador.

Si no defines la variable, la app abre sin pedir nada — cómodo mientras
desarrollas, pero no dejes así la versión publicada.

Para cambiar la clave: cambia la línea, vuelve a publicar, y cada equipo la
pedirá de nuevo.

## 2. Hasta dónde protege esto

**Lo que sí resuelve:** que cualquiera que dé con la dirección de la app vea las
cotizaciones, los precios y los datos de los clientes de la empresa. Antes, con
solo tener el enlace se veía todo.

**Lo que no resuelve, dicho con claridad:**

- La clave se comprueba en el navegador, así que alguien con conocimientos
  técnicos puede saltársela leyendo el código de la página.
- La clave de la base de datos viaja dentro de ese mismo código. Quien la extraiga
  puede leer, modificar o **borrar todas las cotizaciones** desde fuera de la app,
  porque las políticas actuales de Supabase (archivo `supabase_setup.sql`) dan
  permiso total a esa clave.
- No hay usuarios: no se sabe quién hizo o borró cada cotización.

Para una ferretería con la app compartida solo entre su gente, esto suele ser
suficiente. Si en algún momento la app se expone más, o se quiere saber quién
hizo cada cosa, el siguiente paso es **Supabase Auth**: usuarios con correo y
contraseña, y políticas en la base que solo permitan entrar a quien inició
sesión. Es un trabajo aparte y más grande, pero es el que da seguridad de verdad.

## 3. Copia de seguridad

Hoy los datos viven en dos sitios: el navegador de cada equipo y Supabase.
Supabase en su plan gratuito **pausa los proyectos sin actividad** y no garantiza
respaldos. Conviene exportar de vez en cuando la tabla `cotizaciones` desde el
panel de Supabase (Table Editor → Export → CSV) y guardarla fuera.

## 4. Espacio en el navegador

Cada navegador guarda unos 5 MB. La app avisa en pantalla si el guardado falla
por falta de espacio, en vez de fallar en silencio como antes.

Si aparece ese aviso: descarga en PDF lo que estés haciendo, y avísame — hay
margen para aligerar más los datos guardados.
