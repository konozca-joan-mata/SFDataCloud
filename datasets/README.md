# Datos de práctica (ficticios)

Ficheros para los laboratorios del hub. Todos los datos son inventados. Nombres de fichero y columnas en ASCII (la carga local de Data 360 no admite caracteres multibyte en nombres).

| Fichero | Filas | Categoría sugerida | Clave primaria | Event time |
|---|---|---|---|---|
| crm_customers.csv | 22 | Profile | customer_id | — |
| ecommerce_users.csv | 14 | Profile | user_id | — |
| pos_tickets.csv | 14 | Profile | ticket_id | — |
| orders.csv | 40 | Engagement | order_id | order_datetime |
| web_events.csv | 60 | Engagement | event_id | event_datetime |
| faq_devoluciones.txt | — | Datos no estructurados | — | — |

Referencia (calculada con un script simple, no con Data 360): 50 registros de perfil → 36 personas con sólo email exacto → 20 con email OR teléfono exactos.
