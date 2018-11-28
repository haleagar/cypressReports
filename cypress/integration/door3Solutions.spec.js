/// <reference types="Cypress" />
const path = require('path');
const scriptName = path.basename(__filename, path.extname(__filename));

// allure global not available here, maybe because this code is run in browser and allure is in the node.js server?
// https://docs.cypress.io/guides/guides/plugins-guide.html#
// allure.description('extra description details');
// allure.addArgument('specfile', scriptName);

context('Solutions', () => {
  beforeEach(() => {
    cy.visit('https://dev-door3-v3.pantheonsite.io/solutions', {
      auth: {
        username: 'door3', password: 'door3'
      }
    })
  });

  it('check page title on solutions pages', () => {
    cy.task('scriptName', scriptName);
    cy.title().should('include', 'force a fail');
  });

  describe("simple test that fails", () => {
    it('check page title (expected fail)', () => {

      cy.task('scriptName', scriptName);
      cy.title().should('include', 'force a fail');
    })
  })
});
