require('dotenv').config()
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const simpleParser = require('mailparser').simpleParser;
const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const process = require("process");
const winston = require('winston');

const maildirPath = '/maildir';

const newMailFiles = fs.readdirSync(path.join(maildirPath, 'new'));

const timezoned = () => {
    var options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZone: 'Europe/Stockholm'
    };
    return new Date().toLocaleString('sv-SE', options);
};

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: timezoned
          }),
        winston.format.json()
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
      new winston.transports.File({ filename: 'combined.log' })
    ]
});

function cmd(...command) {
    let p = exec(command[0], command.slice(1));
    return new Promise((resolve) => {
        p.stdout.on("data", (x) => {
            process.stdout.write(x.toString());
        });
        p.stderr.on("data", (x) => {
            process.stderr.write(x.toString());
        });
        p.on("exit", (code) => {
            resolve(code);
        });
    });
}

async function main() {
    await cmd("cupsd");
    await cmd(`lpadmin -p alma-hb -v smb://${process.env.PRINTER_USER}:${process.env.PRINTER_PASSWORD}@${process.env.USER_DOMAIN}/${process.env.HB_PRINTER_ADDRESS}/${process.env.HB_PRINTER_NAME} -E`);
    console.log("This must happen last.");

    const watcher = chokidar.watch(".", {
        cwd: path.join(maildirPath, 'new'),
        ignored: /node_modules|\.git|\.DS_Store/,
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        },
    });

    watcher
        .on('error', error => logger.log('error', `watcher.on.error: ${error}`))
        //Process som startas varje gång ett mail mottagits(fil adderats i mailfolder)
        .on('add', async filename => {
            let source = fs.createReadStream(path.join(maildirPath, 'new', filename));
            let parsed = await simpleParser(source);
            if (parsed.html) {
                incomingmailcontent = parsed.html;
            } else {
                incomingmailcontent = parsed.text
            }
            var printmargin = {
                top: "1.00cm",
                right: "1.00cm",
                bottom: "1.00cm",
                left: "1.00cm",
            };

            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const page = await browser.newPage();

            await page.setContent(incomingmailcontent);

            //Skapa pdf-fil
            await page.pdf({ format: "a5", path: maildirPath + '/' + filename + '.pdf', margin: printmargin });

            await browser.close();
            fs.unlink(path.join(maildirPath, 'new', filename), function (error) {
                if (error) {
                    logger.log('error',`watcher.on.add.source.on.open.printer.onjobend.unlink.emailfile: ${error}`);
                    //outgoing_mail_message.text = `unlink error: ${error}`;
                    //outgoing_mail_message.html = `<p>unlink error: ${error}</p>`;
                    console.log(error)
                }
                logger.log('info','File ' + path.join(maildirPath, 'new', filename) + ' removed successfully.');
                console.log('info', 'File ' + path.join(maildirPath, 'new', filename) + ' removed successfully.')
            });


            // Print a file using a specific printer
            console.log('lp -d alma-hb ' + maildirPath + '/' + filename + '.pdf')
            exec('lp -d alma-hb ' + maildirPath + '/' + filename + '.pdf', (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
            });

        })
        .on('remove', async filename => { logger.log('info', 'File ' + filename + ' removed.'); });
}

main()