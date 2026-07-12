@public @homepage
Feature: Public Homepage
  As a visitor to Jobrator
  I want to browse the public homepage
  So that I can learn about the platform and navigate to key sections

  Background:
    Given the user navigates to the Jobrator homepage

  @smoke @positive @regression @TC_PUB001
  Scenario: TC_PUB001 — Homepage loads and displays the hero banner heading
    Then the hero banner heading "UNLOCK THE DOOR TO YOUR DREAM JOB" should be visible
    And the homepage should load within 5 seconds

  @smoke @positive @regression @TC_PUB002
  Scenario: TC_PUB002 — Homepage navigation menu renders all required items
    Then the navigation menu should contain a link labelled "Home"
    And the navigation menu should contain a link labelled "Resources"
    And the navigation menu should contain a link labelled "Find Jobs"
    And the navigation menu should contain a link labelled "Pricing"
    And the navigation menu should contain a login or register link

  @regression @positive @TC_PUB003
  Scenario Outline: TC_PUB003 — How It Works tabs cycle and display the correct content panel
    When the user clicks the "<tab>" tab in the How It Works section
    Then the corresponding content panel for "<tab>" should be displayed

    Examples:
      | tab                  |
      | ENROLL               |
      | APPLY JOBS           |
      | VERIFIED CANDIDATES  |
      | GET HIRED            |

  @regression @positive @TC_PUB004
  Scenario: TC_PUB004 — Footer links are present and navigate to the correct pages
    Then the footer should contain a link to the Privacy Policy page
    And the footer should contain a link to the Terms and Conditions page
    And the footer should contain a link to the Cookie Policy page
    And the footer should contain a link to the FAQ page
    And the footer should contain a link to the Contact page
    And the footer should contain a link to the About page

  @regression @positive @TC_PUB009
  Scenario Outline: TC_PUB009 — Footer text button "<link>" navigates to its destination page
    When the user clicks the "<link>" link in the footer
    Then the browser should navigate to a page whose URL matches "<url_pattern>"

    Examples:
      | link               | url_pattern |
      | About Us           | about       |
      | Contact Us         | contact     |
      | Cookie Policy      | cookie      |
      | Privacy Policy     | privacy     |
      | Terms & Conditions | terms       |

  @smoke @positive @regression @TC_PUB005
  Scenario: TC_PUB005 — Login or Register CTA navigates to the login page
    When the user clicks the login or register link in the navigation
    Then the user should be redirected to the login page

  @regression @positive @TC_PUB006
  Scenario: TC_PUB006 — Pricing link in navigation navigates to the subscription page
    When the user clicks the Pricing link in the navigation
    Then the user should be redirected to the subscription page

  @regression @ui @TC_PUB007
  Scenario: TC_PUB007 — Homepage is served over HTTPS
    Then the homepage URL should use the HTTPS protocol

  @regression @ui @TC_PUB008
  Scenario: TC_PUB008 — Homepage renders correctly at mobile viewport width
    When the viewport is set to a mobile width of 375 pixels
    Then the homepage should be visible and not horizontally overflow
    And the navigation menu should be accessible at mobile width
