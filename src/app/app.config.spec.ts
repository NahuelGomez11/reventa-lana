import { ApplicationRef } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

describe('bootstrap de la aplicación', () => {
  it('arranca con appConfig y renderiza el shell sin lanzar errores', async () => {
    const host = document.createElement('app-root');
    document.body.appendChild(host);

    let ref: ApplicationRef | undefined;
    await expect(
      bootstrapApplication(AppComponent, appConfig).then((appRef) => {
        ref = appRef;
        return appRef;
      }),
    ).resolves.toBeDefined();

    await ref!.whenStable();

    expect(host.querySelector('header nav')).not.toBeNull();
    expect(host.textContent).toContain('Inicio');

    ref!.destroy();
    host.remove();
  });
});
