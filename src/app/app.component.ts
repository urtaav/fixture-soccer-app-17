import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import 'boxicons';
import { AbstractControl, AsyncValidatorFn, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { FixtureService } from './services/fixture.service';
import { Observable, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { JsonPipe, NgClass } from '@angular/common';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { generatePDFFixtures, generatePDFTable } from './pdf';
const primengModules = [
  ButtonModule,
  InputTextModule,
  MenubarModule,
  TableModule,
  ToastModule,
  BadgeModule,
  ProgressBarModule
]
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, ReactiveFormsModule, ...primengModules, JsonPipe, NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [MessageService]
})
export class AppComponent {


  private messageService: MessageService = inject(MessageService);
  private fixtureService: FixtureService = inject(FixtureService);

  title = 'fixture-soccer-app';

  items: MenuItem[] | undefined = [];

  nameTeam: FormControl = new FormControl('');

  teams = this.fixtureService.teamsList;
  fixture = signal<any>([]);

  @ViewChild('fixturelist') fixturelistElement!: ElementRef;

  constructor() {
    let teamsMap = this.teams().map(t => t.name).sort((a, b) => Math.random() - 0.5);
    this.updateFixture(teamsMap, false);
  }
  onAdd = () => {

    if (this.nameTeam.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El nombre es un campo requerido' });
      return;
    }


    let newTeam = {
      id: self.crypto.randomUUID(),
      name: this.nameTeam.value
    };

    console.log({ newTeam });
    this.fixtureService.addTeam(newTeam);
    this.nameTeam.reset("")

  }

  onDelete = (id: number) => {
    this.fixtureService.deleteTeam(id);
  }

  onGenerateFixture = () => {
    console.log(this.teams().length)
    if (this.teams().length === 0) {
      console.log('No se puede generar el calendario. No tienes ningún equipo registrado');
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se puede generar el calendario. No tienes ningún equipo registrado' });
      return;
    }

    if (this.teams().length % 2 === 0) {
      console.log('Generar calendario...');
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Generando calendario' });
      let teamsMap = this.teams().map(t => t.name).sort((a, b) => Math.random() - 0.5);
      this.updateFixture(teamsMap, true);

    } else {
      // La longitud del array no es par, no puedes generar el calendario
      console.log('No se puede generar el calendario. La cantidad de equipos no es par.');
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se puede generar el calendario. La cantidad de equipos no es par.' });
    }
  }


  updateFixture = (teamsMap: any, isSort: boolean) => {
    console.log("teamsMap", teamsMap);
    if (teamsMap.length > 0) {
      if (isSort) {
        this.fixture.set(this.fixtureService.generateFixture(teamsMap));
        this.fixtureService.saveFixture(this.fixture());
      } else {
        this.fixture.set(this.fixtureService.getFixture() ?? []);
      }

      console.log("fixture", this.fixture())
    }
  }

  onExportToPdf = () => {
    // this.fixtureService.exportToPdf(this.fixturelistElement.nativeElement);
    this.fixtureService.exportToPDF(this.fixture())
    const products = [
      { nombre: 'Laptop', cantidad: 2, total: 1500 },
      { nombre: 'Teclado', cantidad: 5, total: 50 },
      { nombre: 'Monitor', cantidad: 1, total: 300 },
      { nombre: 'Ratón', cantidad: 3, total: 30 },
      { nombre: 'Auriculares', cantidad: 4, total: 120 },
      { nombre: 'Impresora', cantidad: 1, total: 200 },
      { nombre: 'Cámara', cantidad: 2, total: 500 },
      { nombre: 'Micrófono', cantidad: 3, total: 80 },
      { nombre: 'Altavoces', cantidad: 2, total: 100 },
      { nombre: 'Webcam', cantidad: 1, total: 70 },
      { nombre: 'Tarjeta gráfica', cantidad: 1, total: 400 },
      { nombre: 'Placa base', cantidad: 2, total: 150 },
      { nombre: 'Memoria RAM', cantidad: 4, total: 250 },
      { nombre: 'Disco duro', cantidad: 3, total: 300 },
      { nombre: 'Fuente de alimentación', cantidad: 2, total: 100 },
      { nombre: 'Silla ergonómica', cantidad: 1, total: 150 },
      { nombre: 'Teclado mecánico', cantidad: 2, total: 120 },
      { nombre: 'Monitor 4K', cantidad: 1, total: 600 },
      { nombre: 'Charger portátil', cantidad: 3, total: 45 },
      { nombre: 'Smartphone', cantidad: 1, total: 500 },
      { nombre: 'Tablet', cantidad: 2, total: 250 },
      { nombre: 'Disco SSD', cantidad: 2, total: 180 },
      { nombre: 'Cable HDMI', cantidad: 6, total: 15 },
      { nombre: 'Proyector', cantidad: 1, total: 350 },
      { nombre: 'Funda para Laptop', cantidad: 4, total: 40 },
      { nombre: 'Hub USB', cantidad: 5, total: 25 },
      { nombre: 'Lámpara LED', cantidad: 3, total: 60 },
      { nombre: 'Batería externa', cantidad: 4, total: 80 },
      { nombre: 'Sofá inteligente', cantidad: 1, total: 800 },
      { nombre: 'Reloj inteligente', cantidad: 2, total: 150 },
      { nombre: 'Gafas VR', cantidad: 1, total: 300 },
      { nombre: 'Dispositivo de streaming', cantidad: 3, total: 120 },
      { nombre: 'Smartwatch', cantidad: 4, total: 200 },
      { nombre: 'Teclado numérico', cantidad: 5, total: 40 },
      { nombre: 'Cargador inalámbrico', cantidad: 6, total: 50 },
      { nombre: 'Cámara de seguridad', cantidad: 2, total: 180 },
      { nombre: 'Soporte para laptop', cantidad: 3, total: 35 }
    ];

    const reciboNo = '123456789'

    const fecha = '07 de Marzo de 2024'



    // generatePDFTable(products, reciboNo, fecha)
  }

  nombreEquipoAsyncValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      return control.valueChanges.pipe(
        debounceTime(300),
        switchMap(value =>
          this.fixtureService.checkNombreEquipoExists(value).pipe(
            catchError(() => of(null))
          )
        ),
        map((result: any) => {

          console.log({ result })
          if (result) {
            control.setErrors(result);
          }
          return result;
        })
      );
    };
  }
}
