## PARA TESTAR DIALOGFLOW en local

**1 .- **Hacer una cuenta de ngrok

**2 .- **instalar Ngrok

**3 .- **arrancar nuestro servidor (npm run start)

**4 .- **Lanzar Ngrok contra nuestro servidor local (ngrok http http://localhost:3000)

**5 .- **Ngrok nos ofrecera una url

**6 .- **Configurar el el fullfilment del panel de control de dialogflow para que busque el webhook en este servidor de Ngrok (https://dialogflow.cloud.google.com/#/agent/primerproyecto-lkbltx/fulfillment)

**7 .- **Accedemos a esta url en el navegador y aparece una pantalla de confirmacion.

**8 .- **al pulsar en "visit page" entraremos en la web de quijote y todo deberia funcionar correctamente.

**9 .- **Cada vez que reiniciemos Ngrok nos dara una url diferente, que tendremos que cambiar en el fullfilment de Diialogflow
