# GESSI — Plataforma de operación para empresa de seguridad

Fecha: 2026-10-21 · Cliente: G.E.S.S.I. Soluciones en Seguridad (Claudio Luna), Uruapan, Mich. · Proveedor: HAVOC

## Intención

Claudio tiene <50 guardias repartidos en 6–10 **servicios** (en lenguaje GESSI, *servicio = cliente*: fraccionamientos, empaques). Hoy sus expedientes de personal están dispersos y no tiene control de asistencia que alimente la nómina. Vio RHATA y le gustó; quiere una plataforma propia con su marca. Es el primer cliente al que HAVOC vende RHATA + Rondines como producto — queremos esmerarnos en la entrega.

## Estructura: 3 paneles en una sola plataforma web

Un solo login, un selector de panel arriba (PERSONAL · RONDINES · FINANZAS), cada panel con su menú lateral.

### 1. PERSONAL (base: RHATA)
- Expedientes completos de guardias (datos, foto, documentos, formatos descargables, bajas/salidas, usuarios/roles) — igual que RHATA.
- Se quitan: formatos de sindicato propios de ATA (Claudio sube los suyos), mapeo de reloj checador (no hay reloj; la asistencia viene de la app).
- **Asistencia:** jornadas por guardia y por servicio (entrada/salida, selfie, GPS), para revisión.
- **Pre-nómina:** hoja de cálculo (Excel) por rango de fechas elegido (semana o quincena) con, por guardia: turnos trabajados, horas totales, promedio semanal, faltas, observaciones. Formato compatible para importar a **NOMIPAQ (CONTPAQi)**. La nómina la sigue calculando NOMIPAQ.
- **Historial de pagos:** se sube después; formato pendiente hasta saber el banco (última fase).

### 2. RONDINES (base: Rondines Grupo ATA)
- Todo lo que tiene rondines ATA: Dashboard, **Mapa en vivo**, Alertas, Reportes, Puntos QR, Guardias.
- **Nueva pestaña Clientes (Servicios):** nombre, dirección, ubicación GPS y radio de la caseta, contacto, guardias asignados, celular de caseta vinculado, y si el servicio tiene rondines contratados (sí/no). Los puntos QR pertenecen a un servicio.

### 3. FINANZAS (base: Finanzas de Gioval)
- Se conserva: Dashboard KPIs, Estado de Resultados, Movimientos, Categorías, Cuentas por Pagar, Reportes, Corte.
- Se quita lo médico/retail: Insumos, Kits por tratamiento, Ganancia por tratamiento, Farmacia, Caja POS.
- *Mi propuesta (confirmar):* "Ganancia por tratamiento" se convierte en **Ganancia por servicio** (lo que cobra al cliente − costo de guardias asignados), y se agrega **Cuentas por Cobrar** por servicio (mensualidad de cada cliente).

## App del guardia (base: app móvil Rondines, Expo)

Un celular por servicio, compartido por los guardias del turno. La app funciona como **checador de caseta**:

- El celular se vincula una vez a un servicio y queda con sesión fija.
- **Inicio / fin de jornada:** el guardia se elige de la lista de asignados al servicio → PIN de 4 dígitos → selfie. Se guarda hora + GPS.
- **Rondines** (solo si el servicio los tiene): escaneo QR atribuido al guardia con jornada abierta; si hay dos en turno, elige quién + PIN.
- SOS y push como en la app actual.
- Turnos base **12x36** (4 guardias cubren 24/7, ~44 h/semana promedio en 15 días). Una jornada se registra con su hora real aunque cruce medianoche y cuenta como una jornada.

## No-metas

- No calcular nómina (lo hace NOMIPAQ).
- No reconocimiento facial automático (selfie + revisión humana basta para <50 guardias; se puede agregar después).
- No multi-empresa: GESSI es un solo cliente, una instalación.
- No configurar esquemas de turno distintos a 12x36 hasta que el cliente lo pida.

## Anti-metas (fracaso aunque "funcione")

- Que un guardia pueda checar por otro sin dejar rastro (selfie obligatoria).
- Que la pre-nómina no se pueda importar a NOMIPAQ y Claudio tenga que recapturar.
- Que se vea como "RHATA con otro nombre": marca GESSI en todo.
- Perder archivos de expedientes (nunca rsync sin excluir `uploads/`).

## Restricciones / decisiones técnicas (mi decisión)

- Proyecto `~/gessi/`, repo git propio. Puertos: backend **3018**, Postgres **5447** (bind 127.0.0.1), nginx **8101**. Servidor Hetzner 62.238.3.136, PM2 como `apps`, `/home/apps/gessi/`.
- **Un solo backend** Node/Express + PostgreSQL (fork del de RHATA); se le portan las rutas de rondines (bajadas del servidor `/var/www/rondines/backend/src/` — el repo `rondines-repo` está incompleto) y las de finanzas de Gioval.
- **Un solo frontend** React + Vite (fork del de RHATA); las páginas del panel de rondines (CRA) y de finanzas de Gioval se portan dentro.
- App móvil: fork de `rondines-repo/mobile` (Expo SDK 54), build APK con EAS.
- Marca: logo y colores de solucionesenseguridad.com.mx. Dominio sugerido `app.solucionesenseguridad.com.mx` con HTTPS si Claudio da acceso al DNS; mientras, por IP:8101.

## Orden de entrega

1. Esqueleto: fork RHATA → GESSI, marca, selector de 3 paneles, panel PERSONAL funcionando, deploy en :8101.
2. RONDINES: rutas + páginas portadas, pestaña Clientes/Servicios, mapa en vivo.
3. App checador (vincular celular, PIN + selfie, jornadas) + vista de Asistencia.
4. Pre-nómina Excel compatible NOMIPAQ.
5. FINANZAS portado y adaptado.
6. Historial de pagos (cuando se sepa el banco).

## Pendientes del cliente

- Logo en alta resolución y colores oficiales.
- Ejemplo/plantilla de importación de NOMIPAQ que usa (para que el Excel sea exacto).
- Banco con el que paga y ejemplo de comprobante.
- Lista de servicios (clientes) con dirección y guardias asignados.
- Acceso DNS si se quiere subdominio propio.
