@dashboard @ai @cv-generator
Feature: Generate CV with AI
  As a registered candidate on Jobrator
  I want to use AI to generate content while building my CV
  So that I can create a professional resume quickly without writing every section from scratch

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: CV builder is accessible and structured correctly
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Authenticated candidate accesses the CV builder from the CV manager

    Background:
      Given the authenticated candidate is on the dashboard

    @smoke @positive @regression @requires-login @TC063
    Scenario: TC063 — Create your CV link is accessible from the CV manager page
      When the candidate navigates to the CV manager page
      Then the Create your CV link should be present on the CV manager page

    @smoke @positive @regression @requires-login @TC064
    Scenario: TC064 — Candidate navigates to the CV builder from the CV manager
      When the candidate navigates to the CV manager page
      And the candidate clicks the Create your CV link
      Then the candidate should be redirected to the CV builder page
      And the CV builder form should be fully loaded and visible

    @regression @positive @requires-login @TC065
    Scenario: TC065 — CV builder form displays all required sections
      When the candidate navigates to the CV builder page directly
      Then the CV builder page should display a personal details section
      And the CV builder page should display a skills selection field
      And the CV builder page should display an experience section
      And the CV builder page should display an about or summary section

    @regression @positive @requires-login @TC066
    Scenario: TC066 — Generate via AI button is available in the experience section
      When the candidate navigates to the CV builder page directly
      Then the Generate via AI button should be visible in the experience section

    @regression @positive @requires-login @TC067
    Scenario: TC067 — Write via AI button is available in the about section
      When the candidate navigates to the CV builder page directly
      Then the Write via AI button should be visible in the about section

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: AI features require a Jobrator Plus subscription
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Unsubscribed candidate sees the subscription prompt when using AI features

    Background:
      Given the authenticated candidate is on the dashboard

    @regression @positive @requires-login @TC068
    Scenario: TC068 — Clicking Generate via AI prompts an unsubscribed candidate to subscribe
      When the candidate navigates to the CV builder page directly
      And the candidate clicks the Generate via AI button in the experience section
      Then a Subscription Required modal should appear
      And the modal should offer a Subscribe option and a Cancel option
      When the candidate dismisses the subscription modal
      Then the subscription modal should be closed

    @regression @positive @requires-login @TC069
    Scenario: TC069 — Clicking Write via AI prompts an unsubscribed candidate to subscribe
      When the candidate navigates to the CV builder page directly
      And the candidate clicks the Write via AI button in the about section
      Then a Subscription Required modal should appear
      And the modal should offer a Subscribe option and a Cancel option
      When the candidate dismisses the subscription modal
      Then the subscription modal should be closed

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 3: Subscribed candidate can use AI features to build their CV
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Subscribed candidate uses AI to generate CV content

    Background:
      Given a new candidate is registered and logged in
      And the candidate subscribes to Jobrator Plus using the Paystack test success card

    @regression @positive @TC070
    Scenario: TC070 — Subscribed candidate generates an experience description via AI
      When the candidate navigates to the CV builder page directly
      And the candidate fills in all required fields for AI generation
      And the candidate clicks the Generate via AI button in the experience section
      And the candidate enters experience points "Built REST APIs, led team of 5 devs, improved performance by 40%" and clicks Generate
      Then the experience description field should be populated with AI-generated content

    @regression @positive @TC071
    Scenario: TC071 — Subscribed candidate uses Write via AI to generate the about section
      When the candidate navigates to the CV builder page directly
      And the candidate fills in all required fields for AI generation
      And the candidate clicks the Generate via AI button in the experience section
      And the candidate enters experience points "Built REST APIs and microservices" and clicks Generate
      And the candidate clicks the Write via AI button in the about section
      Then the about field should be populated with AI-generated content

    @regression @positive @TC072
    Scenario: TC072 — Subscribed candidate creates a complete AI-assisted CV
      When the candidate navigates to the CV builder page directly
      And the candidate fills in all required fields for AI generation
      And the candidate clicks the Generate via AI button in the experience section
      And the candidate enters experience points "Led engineering team, delivered 3 major product launches" and clicks Generate
      And the candidate clicks the Write via AI button in the about section
      And the candidate submits the CV builder form
      Then the CV builder form submission should be processed

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 4: Validation and security
  # ─────────────────────────────────────────────────────────────────────────

  Rule: CV builder enforces validation and protects against injection

    Background:
      Given the authenticated candidate is on the dashboard

    @regression @negative @requires-login @TC073
    Scenario: TC073 — CV builder form shows validation error when submitted with empty required fields
      When the candidate navigates to the CV builder page directly
      And the candidate submits the CV builder form without filling in any fields
      Then the CV builder form should display a validation error for the required fields

    @regression @security @owasp @a03-injection @requires-login @TC074
    Scenario: TC074 — OWASP A03 — XSS payload in the skills field is sanitised before CV creation
      When the candidate navigates to the CV builder page directly
      And the candidate enters "<script>alert('cv-ai-xss')</script>" into the skills field
      And the candidate submits the CV builder form
      Then the XSS script should not execute on the CV builder page
      And no alert dialog should have been triggered on the CV builder page

    @regression @security @owasp @a01-access-control @requires-login @TC075
    Scenario: TC075 — OWASP A01 — CV builder page URL does not expose sensitive tokens or credentials
      When the candidate navigates to the CV builder page directly
      Then the CV builder page URL should not expose any sensitive tokens or user credentials

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 5: Unauthenticated access is blocked
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Unauthenticated access to the CV builder is blocked

    Background:
      Given no active browser session exists for the dashboard tests

    @regression @security @owasp @a01-access-control @TC076
    Scenario: TC076 — OWASP A01 — Accessing the CV builder URL without a session redirects to login
      When a user without an active session navigates directly to the CV builder URL
      Then the user should be denied access and redirected to the login page
