import { Injectable, inject, signal } from '@angular/core';
import { of } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import html2canvas from 'html2canvas';
import { jsPDF } from "jspdf";

interface Team {
  id:string,
  name:string
}
@Injectable({
  providedIn: 'root'
})
export class FixtureService {

  private localStorageService: LocalStorageService = inject(LocalStorageService);
  private teams:Team[] = this.localStorageService.getItem("teams") ?? [];

  teamsList = signal<Team[]>(this.teams);

  addTeam = (newTeam: Team) => {
    this.teamsList.update((teams) => [newTeam, ...teams]);
    this.localStorageService.setItem("teams",this.teamsList())
  }

  deleteTeam = (id: number) => {
    this.teamsList.update((teams) =>
      teams.filter((t: any) => t.id !== id)
    );
    this.localStorageService.setItem("teams",this.teamsList())
  }


  checkNombreEquipoExists = (name:string) => {
    console.log("checkNombreEquipoExists",name);
    const exists = this.teamsList().some(team => team.name === name);

    console.log(this.teamsList());
    console.log({exists})
    return of(exists ? { nameIsAlready: true } : null);

  }

  generateFixture = (teams:any[]) => {
    const fixtures = [];

    // Check if the number of teams is even or odd
    const isEven = teams.length % 2 === 0;
  
    // Add a bye for odd number of teams
    if (!isEven) {
      console.error('No existen suficientes equipos para continuar')
    }
  
    // Generate rounds
    for (let round = 0; round < teams.length - 1; round++) {
      const roundFixtures = [];
  
      // Generate matches for each round
      for (let i = 0; i < teams.length / 2; i++) {
        const homeTeam = teams[i];
        const awayTeam = teams[teams.length - 1 - i];
  
        // Skip BYE matches
        if (homeTeam !== "BYE" && awayTeam !== "BYE") {
          roundFixtures.push({
          "homeTeam":homeTeam,
          "awayTeam":awayTeam
    
          });
        }
      }
  
      fixtures.push(roundFixtures);
  
      // Rotate teams
      teams.splice(1, 0, teams.pop());
    }
  
    return fixtures;
  }

  saveFixture = (fixture:any) => {
    localStorage.setItem('fixture',JSON.stringify(fixture));
  }
  getFixture = () => {
    let fixture = localStorage.getItem('fixture');
    console.log("getFixture",fixture);
    if(fixture){
      return JSON.parse(fixture);
    }

    return null;
  }

  exportToPdf = (fixturelistElement:HTMLElement) => {
    console.log("exportToPdf");
    html2canvas(fixturelistElement, { scale: 2 }).then((canvas) => {
      console.log({canvas});
      const imageGeneratedFromTemplate = canvas.toDataURL('image/png');
      const fileWidth = 270;
      const generatedImageHeight = (canvas.height * fileWidth) / canvas.width;
      let PDF = new jsPDF('l', 'mm', 'a4',);
      PDF.text(`Torneo de Fútbol 7  "Barrio La Cantera" 2024`,PDF.internal.pageSize.getWidth() / 2, 20, { align: 'center'} );
      PDF.addImage(imageGeneratedFromTemplate, 'PNG', 10, 25, fileWidth, generatedImageHeight,);
      PDF.save(`Enfrentamientos-La Cantera 2024::` + crypto.randomUUID());
    });
  }
}
