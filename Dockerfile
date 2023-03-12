FROM node:16.13.2

##Puppeteer dependencies
RUN apt-get update && \
    apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 \
    libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libgbm-dev \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
    fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install CUPS client and Samba client utilities
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y cups cups-client smbclient

# RUN sed -i 's/Listen.*/Listen 0.0.0.0:631/g' /etc/cups/cupsd.conf
RUN sed -i 's/Listen.* /Listen *:631/g' /etc/cups/cupsd.conf

# Create the /etc/cups directory and the client.conf file
# RUN mkdir -p /etc/cups && \
#    echo "ServerName cups-server" > /etc/cups/client.conf

# Copy environment file with printer settings and password
#COPY mailprint.env /run/env.list

# Load environment variables from file
#RUN source /run/env.list

# Add IPP printer
#RUN lpadmin -p alma-telge -v ipp://$TELGE_PRINTER_ADDRESS/ipp/print -E -m everywhere

# Add Samba printer
#RUN lpadmin -p alma-hb -v smb://$PRINTER_USER:$PRINTER_PASSWORD@$USER_DOMAIN/$HB_PRINTER_ADDRESS/$HB_PRINTER_NAME -E
    
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]

## entrypoint:
#!/bin/bash
#if [ "$APP_ENV" = "production" ]; then
#    npm start
#else
#    npm install
#    npm run dev
#fi