// Import document classes.
import { shiverActor } from "./documents/actor.mjs";
import { shiverItem } from "./documents/item.mjs";
// Import sheet classes.
import { shiverActorSheet } from "./sheets/actor-sheet.mjs";
import { shiverItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { shiver } from "./helpers/config.mjs";
import { ShiverSkillDie } from "./system/dice.mjs";
import { ShiverTalentDie } from "./system/dice.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.shiver = {
    shiverActor,
    shiverItem,
    rollItemMacro
  };

  // Add custom constants for configuration.
  CONFIG.shiver = shiver;
  CONFIG.Dice.terms["6"] = ShiverSkillDie;
  CONFIG.Dice.terms["8"] = ShiverTalentDie;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "@speed.value",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = shiverActor;
  CONFIG.Item.documentClass = shiverItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("shiver", shiverActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("shiver", shiverItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

// Dice so Nice support!
Hooks.once('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({id:"shiver",name:"shiver"},"preferred");
  dice3d.addDicePreset({
    type:"d6",
    labels:[
      "systems/shiver/assets/dice/skill/SHIVER_GRIT.png",
      "systems/shiver/assets/dice/skill/SHIVER_WIT.png",
      "systems/shiver/assets/dice/skill/SHIVER_SMARTS.png",
      "systems/shiver/assets/dice/skill/SHIVER_HEART.png", 
	    "systems/shiver/assets/dice/skill/SHIVER_STRANGE.png",
      "systems/shiver/assets/dice/skill/SHIVER_LUCK.png",
    ],
    bumpMaps:[
            ,,,,,,
    ],
    system:"shiver"
  });

  dice3d.addDicePreset({
    type:"d8",
    labels:[
      "systems/shiver/assets/dice/talent/SHIVER_T_STRANGE2.png",
      "systems/shiver/assets/dice/talent/SHIVER_T_STRANGE.png",
      "systems/shiver/assets/dice/talent/SHIVER_T_STRANGE.png",
      "systems/shiver/assets/dice/talent/SHIVER_T_TALENT.png",
      "systems/shiver/assets/dice/talent/SHIVER_T_TALENT.png",
      "systems/shiver/assets/dice/talent/SHIVER_T_TALENT.png",
      "systems/shiver/assets/dice/talent/SHIVER_T_TALENT2.png",
      "systems/shiver/assets/dice/talent/SHIVER_T_TALENT2.png"
    ],
    bumpMaps:[
            ,,,,,,,,
    ],
    system:"shiver"
  });
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.shiver.rollItemMacro("${item.name}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "shiver.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}