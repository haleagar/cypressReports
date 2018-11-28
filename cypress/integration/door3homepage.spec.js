/// <reference types="Cypress" />

context('Homepage', () => {
  beforeEach(() => {
    cy.visit('https://dev-door3-v3.pantheonsite.io/', {
      auth: {
        username: 'door3', password: 'door3'
      }
    })
  })

  it('check page title on home page', () => {
    cy.title().should('include', 'Digital Strategy');
  })
});
