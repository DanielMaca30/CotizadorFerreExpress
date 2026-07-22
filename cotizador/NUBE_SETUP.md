# Sincronización en la nube — Guía rápida

Con esto, **todas las PC de la empresa ven las mismas cotizaciones, la misma
numeración, el mismo membrete y los mismos productos frecuentes**. Sin esto, la
app sigue funcionando igual pero guardando solo en cada computador (local).

> La app funciona **con o sin nube**. Si no configuras nada, todo se guarda
> localmente como hasta ahora. Al agregar las credenciales, se activa la nube.

## Pasos (una sola vez, ~10 minutos)

1. **Crea una cuenta gratis en Supabase** → https://supabase.com → *New project*.
   Anota la contraseña de la base de datos (no la necesitarás para la app).

2. **Crea las tablas.** En el panel de Supabase entra a **SQL Editor → New query**,
   pega el contenido del archivo `supabase_setup.sql` (está en esta carpeta) y
   presiona **Run**. Debe decir *Success*.

3. **Copia tus credenciales.** En Supabase entra a **Project Settings → API** y copia:
   - **Project URL** (algo como `https://xxxxxxxx.supabase.co`)
   - **anon public** key (una cadena larga)

4. **Pega las credenciales en la app.** En la carpeta `cotizador`, edita el archivo
   `.env` y agrega estas dos líneas (con tus valores):

   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...tu-clave-anon...
   ```

   > Opcional: `VITE_ORG_ID=ferreexpress` — deja el mismo valor en **todas** las PC
   > para que compartan los datos. (Si pones valores distintos, se separan.)

5. **Reinicia / vuelve a desplegar la app.**
   - En desarrollo: detén y corre de nuevo `npm run dev`.
   - En producción (Vercel): agrega esas mismas variables en
     **Project → Settings → Environment Variables** y haz *Redeploy*.

Listo. En la esquina del **Historial** aparecerá una etiqueta **☁ Nube** cuando
esté sincronizando. Los cambios de una PC aparecen en las otras en unos segundos
(al abrir, cada 30 s y al volver a la pestaña).

## ¿Qué pasa con las cotizaciones que YA tengo en el PC?

**No se pierde ni se borra nada.** Al activar la nube:

1. La **primera PC que abras** sube automáticamente a la nube todas las
   cotizaciones que ya tenía guardadas (se quedan también en local como respaldo).
2. Las **demás PC** las descargan y quedan todas con la misma información.
3. La **numeración se protege sola**: la app detecta el número más alto que ya
   usaste (por ejemplo `COT-045`) y ajusta el contador de la nube para que la
   siguiente cotización sea `COT-046` — **nunca repite un número anterior**.

> **Recomendación:** activa la nube y **abre primero la PC de la empresa** (la que
> tiene tus cotizaciones actuales). Así esa PC "siembra" la nube con tu historial
> y luego los demás computadores lo reciben. Si abres primero una PC vacía, no
> pasa nada malo — igual se fusiona todo al abrir la PC con los datos.

## Cómo funciona (resumen)

- Cada PC guarda **primero en local** (rápido y sirve sin internet) y luego
  **sube los cambios a la nube**.
- La **numeración** (`COT-032`, `COT-033`, …) la entrega la base de datos de forma
  atómica, así **dos PC nunca repiten el mismo número**.
- La primera vez que activas la nube, las cotizaciones que ya tenías en ese
  computador **se suben automáticamente**.
- Si una PC está sin internet, sigue trabajando local y sincroniza cuando vuelve
  la conexión.

## Notas de seguridad

Este montaje usa un **espacio de trabajo compartido** con la clave anónima: es
adecuado para uso interno de la ferretería. La clave `anon` es de solo-cliente y
las tablas tienen RLS activado. Si más adelante quieres inicio de sesión por
empleado, se agrega Supabase Auth y políticas por usuario (podemos ayudarte).
