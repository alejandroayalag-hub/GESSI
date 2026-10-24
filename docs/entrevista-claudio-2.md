# Segunda entrevista con Claudio (mar 27 / mié 28 oct 2026)

## Mostrar
- Pizarrón: Avisos + SDR (situaciones de riesgo) con acuse "Enterado" por caseta. Panel → Rondines → Pizarrón / SDR. ✅ en producción 2026-10-24 (la app lo muestra a partir del APK 1.1.0).

## Cambios propuestos para la app (por confirmar con Claudio)
- [ ] **Entrada de turno nueva:** guardia elige su nombre → PIN → selfie de rostro → foto de cuerpo completo (para revisar el uniforme; la toma el guardia que sale) → escanea el QR de la caseta → queda registrada.
    - ✅ Decidido 2026-10-24: QR de caseta en ENTRADA y SALIDA (con GPS). Sin guardia saliente → el guardia toma su propia foto de cuerpo completo.
    - ✅ Decidido: cada checada guarda hora, GPS, QR de caseta y fotos. Con eso se cumple el registro de jornada de la LFT.
    - El QR de la caseta es uno por servicio, se imprime desde el panel (Clientes).
- [ ] **Biometría:** decidir si se guarda solo la foto como evidencia o una plantilla facial. La plantilla es dato sensible: requiere consentimiento expreso y por escrito + aviso de privacidad.

## Notas legales (por validar por Alejandro)
- Reforma LFT, DOF 1-may-2026: art. 132 fr. XXXIV, registro electrónico de jornada (hora de inicio y fin), entregarlo a la autoridad cuando lo pida. Multa del art. 994 fr. IV Bis: 250–5,000 UMA. Según las fuentes consultadas no exige biometría; revisar el decreto y los lineamientos de la STPS.
- Identidad: PIN (firma electrónica simple) + selfie + QR físico de la caseta + GPS. No hace falta e.firma de cada guardia.

## Preguntas abiertas que ya teníamos
- [ ] Banco con el que paga (para historial de pagos, fase 6)
- [ ] Plantilla real de importación de NOMIPAQ
- [ ] Dominio para HTTPS (hoy http://62.238.3.136:8101)
- [ ] Logo en alta resolución
- [ ] Probar APK en el celular real de una caseta

## Ideas para ofrecer sobre el pizarrón (se decidió no hacerlas en v1)
- [ ] Que el guardia pueda reportar un SDR desde la app (oficina aprueba antes de publicar)
- [ ] SDR con punto en el mapa en vivo
- [ ] Notificación push real (hoy la app revisa cada 60 s y vibra solo si está abierta)
