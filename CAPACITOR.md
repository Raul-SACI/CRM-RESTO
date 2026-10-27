# CLUB CRAFT — App nativa con Capacitor (Play Store + App Store)

Esta guía explica cómo compilar, probar y publicar la app en Google Play y en
la App Store de iOS. El andamiaje ya está armado en el repo; vos tenés que
ejecutar los pasos en tu computadora, crear las cuentas de desarrollador y subir
los paquetes.

---

## 0. Qué ya quedó listo en el repo

- Capacitor instalado (`@capacitor/core`, `cli`, `android`, `ios` + plugins
  `app`, `push-notifications`, `splash-screen`, `status-bar`, `browser`).
- `capacitor.config.ts` configurado (appId `ar.com.craftclub.app`, nombre
  "CLUB CRAFT", colores de splash en rojo).
- Proyectos nativos generados: carpetas `android/` e `ios/`.
- Modo de arranque: **la app carga el sitio en vivo** (`server.url =
  https://craftclub.com.ar`). Así los pagos (`/api`), el login de Google y el
  retorno de Mercado Pago funcionan igual que en la web, y **los cambios que
  publicamos salen al instante sin re-subir a la tienda.**
- Scripts nuevos en `package.json`:
  - `npm run cap:sync` — build web + sincroniza a los proyectos nativos.
  - `npm run cap:android` — build + sync + abre Android Studio.
  - `npm run cap:ios` — build + sync + abre Xcode (solo Mac).

---

## 1. Requisitos (una sola vez)

### Cuentas de desarrollador
- **Google Play Console**: pago único **US$25**. https://play.google.com/console
- **Apple Developer Program**: **US$99/año**. https://developer.apple.com/programs/

### Herramientas en tu compu
- **Node.js 18+** (ya lo usás para la web).
- **Android**: [Android Studio](https://developer.android.com/studio) (trae el
  SDK y todo lo necesario). Funciona en Windows, Mac o Linux.
- **iOS**: una **Mac con Xcode** (obligatorio para compilar y subir a la App
  Store). Si no tenés Mac, se puede usar un servicio tipo
  [Codemagic](https://codemagic.io) o [MacinCloud](https://www.macincloud.com).

---

## 2. Bajar el proyecto y preparar

```bash
git clone https://github.com/Raul-SACI/CRM-RESTO.git
cd CRM-RESTO
npm install
npm run build        # genera dist/
npx cap sync         # copia todo a android/ e ios/
```

---

## 3. Íconos y splash screen

La app necesita el logo como archivo local (hoy el logo vive en una URL de
Supabase). Conseguí el logo en **PNG cuadrado de 1024×1024** y guardalo así:

```
assets/icon.png            (1024×1024, el logo con fondo)
assets/splash.png          (2732×2732, logo centrado sobre fondo rojo #D90015)
```

Después generá todos los tamaños automáticamente:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#D90015' --splashBackgroundColor '#D90015'
```

Esto crea los íconos y splash para Android e iOS. Volvé a correr `npx cap sync`.

---

## 4. Android — compilar, probar y publicar

### Probar en un teléfono / emulador
```bash
npm run cap:android      # abre Android Studio
```
En Android Studio: elegí un dispositivo (o emulador) y tocá ▶️ Run.

### Generar el paquete para la tienda (AAB firmado)
1. En Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. Creá un **keystore** (archivo de firma) y **guardalo muy bien** (sin él no
   podés volver a actualizar la app nunca). Anotá las contraseñas.
3. Se genera un archivo `.aab`.

### Subir a Google Play
1. Entrá a Play Console → **Crear app**.
2. Completá ficha: nombre, descripción, **capturas de pantalla** (teléfono),
   ícono 512×512, gráfico de cabecera 1024×500.
3. **Política de privacidad**: usá `https://craftclub.com.ar/privacidad.html`.
4. Subí el `.aab` en **Producción** (o prueba interna primero).
5. Completá el cuestionario de contenido y enviá a revisión.
   Google suele aprobar en **horas o 1–2 días**.

> Android es flexible con apps que cargan una web: no hay problema.

---

## 5. iOS — compilar, probar y publicar (requiere Mac)

```bash
npm run cap:ios          # abre Xcode (solo Mac)
cd ios/App && pod install   # la primera vez
```
En Xcode:
1. Seleccioná tu **Team** (tu cuenta Apple Developer) en *Signing & Capabilities*.
2. Probá en un iPhone conectado o en el simulador (▶️).
3. Para publicar: **Product → Archive** → **Distribute App** → App Store Connect.
4. En [App Store Connect](https://appstoreconnect.apple.com): completá ficha,
   capturas (varios tamaños de iPhone), descripción, privacidad, y enviá a
   revisión. Apple tarda **1–3 días** y es **más estricto**.

> ⚠️ **Apple y las "apps que son solo una web" (regla 4.2):** para que no la
> rechacen conviene que tenga funcionalidad nativa real. La más natural y útil
> para vos son las **notificaciones push nativas** (ver sección 6). Con eso
> instalado, la probabilidad de aprobación es mucho mayor. Si la rechazan,
> responden qué falta y se ajusta.

---

## 6. Notificaciones push nativas (recomendado, sobre todo para iOS)

Hoy la app manda avisos web (campanita + email). Las push nativas llegan al
teléfono aunque la app esté cerrada — ideal para promos.

### 6.1 Android (Firebase Cloud Messaging)
1. Creá un proyecto en [Firebase](https://console.firebase.google.com).
2. Agregá una app Android con el package `ar.com.craftclub.app`.
3. Descargá `google-services.json` y ponelo en `android/app/`.
4. (El plugin `@capacitor/push-notifications` ya está instalado.)

### 6.2 iOS (APNs)
1. En tu cuenta Apple Developer, creá una **APNs Key**.
2. Subila a Firebase (Cloud Messaging → Apple app configuration) o usá APNs
   directo.
3. En Xcode, activá la capability **Push Notifications** y **Background Modes →
   Remote notifications**.

### 6.3 Código en la app (lo hacemos juntos cuando llegues acá)
Falta un pedacito de código para: pedir permiso, registrar el token del
dispositivo y guardarlo en Supabase (una tabla `push_tokens`), y una función
que envíe las push. **Avisame y lo programo** — es un paso puntual.

---

## 7. Actualizar la app

Como la app carga el sitio en vivo (`server.url`), **la mayoría de los cambios
salen solos** al publicar en Vercel (como hasta ahora). Solo tenés que volver a
compilar y subir a la tienda si cambiás:
- el ícono / nombre / splash,
- plugins nativos (ej. push),
- la versión (número de build).

Para re-sincronizar cambios nativos:
```bash
npm run cap:sync
```

---

## 8. (Avanzado) Modo empaquetado / offline

Si en el futuro querés que la app funcione **sin internet** y no dependa del
sitio en vivo, se puede empaquetar el build dentro de la app. Para eso hay que:
1. En `capacitor.config.ts`, **quitar `server.url`** (dejar solo `webDir: 'dist'`).
2. Hacer que los llamados a `/api/...` (pagos y emails) apunten al dominio de
   producción cuando corre en la app (hoy son relativos). Es un cambio chico de
   código que **puedo hacer yo** cuando lo decidas.
3. Configurar el **retorno de Mercado Pago y el login de Google por deep links**
   (esquema propio de la app). También lo programo cuando haga falta.
4. Para actualizaciones instantáneas sin pasar por la tienda, se puede sumar un
   servicio de *live update* como [Capgo](https://capgo.app).

---

## 9. Resumen de costos

| Concepto | Costo |
|---|---|
| Google Play (cuenta) | US$25 (una vez) |
| Apple Developer | US$99 / año |
| Mac para iOS (si no tenés) | servicio en la nube desde ~US$20/mes, o una Mac |
| Firebase (push) | gratis en el plan base |

---

## 10. Orden sugerido

1. **Android primero** (barato, rápido, sin la traba de Apple).
2. Sumar **push nativo**.
3. **iOS** con la Mac y push ya listos.

Cuando estés en cualquier paso (íconos, push, deep links, rechazos de Apple),
avisame y lo resolvemos juntos.
