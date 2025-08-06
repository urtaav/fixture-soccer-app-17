import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = pdfFonts.vfs;

type Product = {
    nombre: string;
    cantidad: number;
    total: number;
};

const generatePDFFixtures = (matches: any[], anio: number | string, fecha: string,nameDoc:string) => {

    console.log({ matches })
    const styles = {
        header: {
            fontSize: 14,
            bold: true,
        },
        subheader: {
            fontSize: 10,
            margin: [0, 4, 0, 4],
        },
        fixtureBox: {
            margin: [3,3,3,3],
            fontSize: 8,
            alignment: 'center',
            border: [false, false, false, false],
        },
        jornadaTitle: {
            fontSize: 10,
            bold: true,
            alignment: 'center'
        },
        vsText: {
            bold: true
        },

    };

    // Cada partido como una pequeña "caja"
    const fixtureBoxes = matches.map((match: any[], index: number) => {
        return {
            stack: [
                // Título de la jornada
                {
                    text: `Jornada ${index + 1}`,
                    style: 'jornadaTitle',
                    margin: [0, 8, 0, 3], // Margen superior e inferior
                    alignment: 'center',
                },
                // Tabla con los partidos
                {
                    table: {
                        widths: ['*', 30, '*'],
                        body: match.map((e: any) => {
                            return [
                                { text: e.homeTeam, alignment: 'right' },
                                { text: 'VS', style: 'vsText', alignment: 'center' },
                                { text: e.awayTeam, alignment: 'left' }
                            ];
                        })
                    },
                    layout: 'lightLines', // Borde tipo Excel
                    style: 'fixtureBox'
                }
            ],
            margin: [0, 0, 0, 8], // Separación entre jornadas
        };
    });


    // Agrupar en filas de 4 partidos
    const rows: any[][] = [];
    for (let i = 0; i < fixtureBoxes.length; i += 4) {
        rows.push(fixtureBoxes.slice(i, i + 4));
    }

    const content: any[] = [];

    // Encabezado
    content.push({
        columns: [
            {
                stack: [
                    { text: `Torneo de Fútbol 7 "Barrio La Cantera"  ${anio}`, style: 'header' },
                    { text: `Fecha: ${fecha}`, style: 'subheader' },
                ],
                alignment: 'left',
            },
        ],
        margin: [0, 0, 0, 10],
    });

    // Agrupar 2 filas (8 partidos) por hoja
    let rowCount = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rowCount === 2) {
            content.push({ text: '', pageBreak: 'after' });
            rowCount = 0;
        }

        content.push({
            columns: rows[i].map(box => ({
                width: '*',
                stack: [box],
            })),
            columnGap: 5,
            margin: [0, 4],
        });

        rowCount++;
    }

    const docDefinition: any = {
        pageOrientation: 'landscape',
        content,
        styles,
    };

    pdfMake.createPdf(docDefinition).download(nameDoc);
};


//Emplo base
const generatePDFTable = (
    products: Product[],
    reciboNo: string,
    fecha: string
) => {

    const tableBody = [
        [
            { text: "Nombre producto", style: "tableHeader" },
            { text: "Cantidad", style: "tableHeader" },
            { text: "Total", style: "tableHeader" },
        ],
        ...products.map((product) => [
            product.nombre,
            product.cantidad.toString(),
            `$ ${product.total}`,
        ]),
    ];


    const totalGeneral = products.reduce((sum, product) => sum + product.total, 0);


    const content: any[] = [];


    content.push({
        columns: [

            {
                stack: [
                    { text: `Recibo No. ${reciboNo}`, style: "header" },
                    { text: `Fecha: ${fecha}`, style: "subheader" },
                ],
                alignment: "right",
            },
        ],
    });


    content.push({
        qr: 'https://www.youtube.com/@vilcadev',
        fit: 100,
        alignment: "right",
        margin: [0, 10, 0, 10],
    });


    content.push({ text: "\n" });


    content.push({
        table: {
            headerRows: 1,
            widths: ["*", "*", "*"],
            body: tableBody,
        },
        layout: "lightHorizontalLines",
        margin: [0, 10, 0, 10],
    });


    content.push({
        columns: [
            { text: "", width: "*" },
            {
                text: `Total: $ ${totalGeneral}`,
                style: "total",
                alignment: "right",
                margin: [0, 10, 0, 10],
            },
        ],
    });


    const styles = {
        header: {
            fontSize: 14,
            bold: true,
        },
        subheader: {
            fontSize: 12,
            margin: [0, 5, 0, 5],
        },
        tableHeader: {
            bold: true,
            fontSize: 12,
            color: "black",
        },
        total: {
            fontSize: 12,
            bold: true,
        },
    };


    const docDefinition: any = {
        content,
        styles,
    };

    pdfMake.createPdf(docDefinition).open();
};



export { generatePDFTable, generatePDFFixtures };