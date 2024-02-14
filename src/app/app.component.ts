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

const primengModules = [
  ButtonModule,
  InputTextModule,
  MenubarModule,
  TableModule,
  ToastModule
]
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, ReactiveFormsModule, ...primengModules,JsonPipe,NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [MessageService]
})
export class AppComponent {


  private messageService: MessageService = inject(MessageService);
  private fixtureService: FixtureService = inject(FixtureService);

  title = 'fixture-soccer-app';

  items: MenuItem[] | undefined = [ ];

  nameTeam:FormControl =  new FormControl('');

  teams = this.fixtureService.teamsList;
  fixture = signal<any>([]);

  @ViewChild('fixturelist') fixturelistElement!: ElementRef;

  constructor(){
    let teamsMap = this.teams().map(t => t.name).sort((a, b) => Math.random() - 0.5);
    this.updateFixture(teamsMap,false);
  }
  onAdd = () => {

    if(this.nameTeam.invalid){
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El nombre es un campo requerido' });
      return;
    }


    let newTeam = {
      id: self.crypto.randomUUID(),
      name:this.nameTeam.value
    };

    console.log({newTeam});
    this.fixtureService.addTeam(newTeam);
    this.nameTeam.reset("")

  }

  onDelete = (id:number) => {
    this.fixtureService.deleteTeam(id);
  }

  onGenerateFixture = () => {
    console.log(this.teams().length)
    if(this.teams().length === 0){
      console.log('No se puede generar el calendario. No tienes ningún equipo registrado');
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se puede generar el calendario. No tienes ningún equipo registrado' });
      return;
    }

    if (this.teams().length % 2 === 0) {
        console.log('Generar calendario...');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Generando calendario' });
        let teamsMap = this.teams().map(t => t.name).sort((a, b) => Math.random() - 0.5);
        this.updateFixture(teamsMap,true);

    } else {
      // La longitud del array no es par, no puedes generar el calendario
      console.log('No se puede generar el calendario. La cantidad de equipos no es par.');
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se puede generar el calendario. La cantidad de equipos no es par.' });
    }
  }


  updateFixture = (teamsMap: any, isSort: boolean) => {
    console.log("teamsMap",teamsMap);
    if(teamsMap.length > 0) {
      if(isSort){
        this.fixture.set(this.fixtureService.generateFixture(teamsMap));
        this.fixtureService.saveFixture(this.fixture());
      } else{
        this.fixture.set(this.fixtureService.getFixture() ?? []);
      }

      console.log("fixture",this.fixture())
    }
  }
  
  onExportToPdf = () => {
    this.fixtureService.exportToPdf(this.fixturelistElement.nativeElement);
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
        map((result:any) => {

          console.log({result})
          if (result) {
            control.setErrors(result);
          }
          return result;
        })
      );
    };
  }
}
