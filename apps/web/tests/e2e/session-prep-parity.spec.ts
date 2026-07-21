import { expect, test } from "@playwright/test";

test.skip(process.env.RELIC_E2E_AUTH !== "1", "Requires local Supabase and RELIC_E2E_AUTH=1.");

test("GM recovers autosave and carries the latest ordered Prep packet into Stage", async ({ page }) => {
  test.setTimeout(180_000);
  const email="d4-browser@example.test", password="password", sagaName="D4 Prep Parity Saga";
  await page.goto("/auth/sign-up"); await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill(password); await page.getByRole("button",{name:"Create account"}).click();
  const signIn=page.getByRole("heading",{name:"Sign in"}); await Promise.race([signIn.waitFor({state:"visible",timeout:5_000}).catch(()=>undefined),page.getByRole("heading",{name:"Create a playable start"}).waitFor({state:"visible",timeout:5_000}).catch(()=>undefined)]);
  if(await signIn.isVisible().catch(()=>false)){await page.getByLabel("Email").fill(email);await page.getByLabel("Password").fill(password);await page.getByRole("button",{name:"Sign in"}).click();}
  await page.goto("/app/new-saga");await page.getByLabel("Saga name").fill(sagaName);await page.getByLabel("New World name").fill("D4 World");await page.getByRole("button",{name:"Create blank saga"}).click();await expect(page.getByRole("heading",{name:sagaName})).toBeVisible();const root=page.url();

  const entityUrls:Record<string,string>={};
  for(const item of [{type:"character",label:"Character",name:"Mara Vale"},{type:"place",label:"Place",name:"Old Harbor"}]){await page.goto(`${root}/entities/new?type=${item.type}`);await page.getByLabel("Name / title").fill(item.name);await page.getByRole("button",{name:`Create ${item.label}`}).click();await expect(page.getByRole("heading",{name:item.name})).toBeVisible();entityUrls[item.name]=page.url();}
  await page.goto(`${root}/entities/new?type=thread`);await page.getByLabel("Name / title").fill("Forged Succession");await page.getByRole("button",{name:"Create Thread"}).click();

  const sessionUrls:string[]=[];
  for(const session of [{name:"Harbor Witness",schedule:"2026-08-01T19:00",objective:"Find the witness"},{name:"Vault Descent",schedule:"2026-08-08T18:30",objective:"Enter the vault"}]){await page.goto(`${root}/sessions/new`);await page.getByLabel("Name").fill(session.name);await page.getByLabel("Objective").fill(session.objective);await page.getByLabel("Scheduled date and time").fill(session.schedule);await page.getByRole("button",{name:"Create prep workspace"}).click();await page.waitForURL(/\/sessions\/[^/]+\/prep$/);sessionUrls.push(page.url());}

  await page.goto(root);await expect(page.getByRole("navigation",{name:"Future Sessions"}).getByRole("link")).toHaveCount(2);
  const inline=page.getByRole("region",{name:"inline Session Prep editor"});await inline.getByLabel("Objective").fill("Meet the witness before midnight");await expect(inline.getByRole("status")).toContainText("Saved",{timeout:5_000});await inline.getByRole("link",{name:"Open full editor"}).click();await expect(page.getByLabel("Objective")).toHaveValue("Meet the witness before midnight");
  await page.getByLabel("Opening scene").fill("Rain over the harbor bell.");await page.getByLabel("Scene notes").fill("The forged seal changes hands at midnight.");await expect(page.getByRole("status")).toContainText("Saved",{timeout:5_000});await page.goto(root);await expect(page.getByRole("region",{name:"inline Session Prep editor"}).getByLabel("Scene notes")).toHaveValue("The forged seal changes hands at midnight.");

  await page.context().setOffline(true);await inline.getByLabel("Scene notes").fill("Network-safe clue survives refresh.");await expect(inline.getByRole("status")).toContainText("Offline",{timeout:5_000});await page.context().setOffline(false);await page.reload();const recovered=page.getByRole("region",{name:"inline Session Prep editor"});await expect(recovered.getByLabel("Scene notes")).toHaveValue("Network-safe clue survives refresh.");await expect(recovered.getByRole("status")).toContainText("Recovered");await recovered.getByRole("button",{name:"Retry save"}).click();await expect(recovered.getByRole("status")).toContainText("Saved",{timeout:5_000});await page.reload();await expect(page.getByLabel("Scene notes")).toHaveValue("Network-safe clue survives refresh.");

  await page.getByLabel("Add pinned record").selectOption({label:"Mara Vale · character"});await page.getByLabel("Add pinned record").selectOption({label:"Old Harbor · place"});await page.getByLabel("Add Thread").selectOption({label:"Forged Succession"});await page.getByRole("button",{name:"Move Old Harbor up"}).click();await expect(page.getByRole("status")).toContainText("Saved",{timeout:5_000});await page.reload();const pinNames=await page.getByRole("region",{name:"Pinned entities"}).locator("li>span:first-child").allTextContents();expect(pinNames.slice(0,2)).toEqual(["Old Harbor","Mara Vale"]);

  await page.goto(entityUrls["Old Harbor"]);await page.getByRole("button",{name:"Archive record"}).click();await page.goto(sessionUrls[0]);await expect(page.getByText(/Old Harbor · archived/i)).toBeVisible();await page.getByLabel("Scheduled date and time").fill("2026-08-01T20:15");await expect(page.getByRole("status")).toContainText("Saved",{timeout:5_000});
  await page.getByRole("button",{name:"Ready for Stage"}).click();await expect(page).toHaveURL(/\/stage$/);await expect(page.getByRole("region",{name:"Agenda"})).toContainText("Meet the witness before midnight");await expect(page.getByRole("region",{name:"Agenda"})).toContainText("Network-safe clue survives refresh.");await expect(page.getByLabel("Pinned entities").getByText("Old Harbor")).toBeVisible();

  for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]){await page.setViewportSize(viewport);await page.goto(sessionUrls[0]);await expect(page.getByRole("status")).toBeVisible();await page.getByRole("button",{name:"Prep actions"}).focus();await expect(page.getByRole("button",{name:"Prep actions"})).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);}
  await page.goto(sessionUrls[1]);await expect(page.getByLabel("Objective")).toHaveValue("Enter the vault");await expect(page.getByLabel("Scheduled date and time")).toHaveValue("2026-08-08T18:30");
});
