/// <reference types="Cypress" />

context('Solutions', () => {
  beforeEach(() => {
    cy.visit('https://dev-door3-v3.pantheonsite.io/solutions', {
      auth: {
        username: 'door3', password: 'door3'
      }
    })
  });

  it('check page title on solutions pages', () => {
    cy.title().should('include', 'force a fail');
  });

  describe("simple test that fails", () => {
    it('check page title (expected fail)', () => {

      cy.title().should('include', 'force a fail');
    })
  })
});
