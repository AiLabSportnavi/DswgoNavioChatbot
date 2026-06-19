// AUTO-GENERATED from live Salesforce Case picklists + dependency metadata (validFor).
// value = exact Salesforce API value sent to the CaseHandler flow; label = German display.
// The four fields CASCADE: Membership -> CaseGrounds -> Topic -> ShortDescription.
// Picking a child value invalid for its parent makes the flow reject the case, so the
// form must only offer the dependent options below. Regenerate if picklists change.
export type SalesforceOption = { value: string; label: string }

export const MEMBERSHIP_TYPES: SalesforceOption[] = [
  {
    "value": "Corporate Fitness",
    "label": "Firmenmitglied"
  },
  {
    "value": "Private",
    "label": "Privatmitglied"
  },
  {
    "value": "No Membership",
    "label": "Kein Mitglied"
  }
]

export const CASE_GROUNDS_BY_MEMBERSHIP: Record<string, SalesforceOption[]> = {
  "Corporate Fitness": [
    {
      "value": "Membership administration (Corporate)",
      "label": "Meine Mitgliedschaft verwalten (Firma)"
    },
    {
      "value": "General question",
      "label": "Anmeldung und allgemeine Fragen"
    },
    {
      "value": "Partner-related question",
      "label": "Partnerbezogene Fragen"
    }
  ],
  "Private": [
    {
      "value": "Membership administration (Private)",
      "label": "Meine Mitgliedschaft verwalten (Privat)"
    },
    {
      "value": "General question",
      "label": "Anmeldung und allgemeine Fragen"
    },
    {
      "value": "Partner-related question",
      "label": "Partnerbezogene Fragen"
    }
  ],
  "No Membership": [
    {
      "value": "General question",
      "label": "Anmeldung und allgemeine Fragen"
    },
    {
      "value": "Partner-related question",
      "label": "Partnerbezogene Fragen"
    }
  ]
}

export const TOPICS_BY_CASEGROUND: Record<string, SalesforceOption[]> = {
  "Membership administration (Corporate)": [
    {
      "value": "Problem logging in",
      "label": "Problem bei der Anmeldung"
    },
    {
      "value": "Adjust my plan (Corporate)",
      "label": "Meinen Tarif anpassen"
    },
    {
      "value": "Corporate rates",
      "label": "Firmenkonditionen"
    },
    {
      "value": "Question about cancellation",
      "label": "Frage zur Kündigung"
    },
    {
      "value": "Payment/Invoices",
      "label": "Zahlung / Rechnungen"
    },
    {
      "value": "Update personal information",
      "label": "Persönliche Daten aktualisieren"
    },
    {
      "value": "My membership start date",
      "label": "Startdatum meiner Mitgliedschaft"
    },
    {
      "value": "Other",
      "label": "Sonstiges"
    }
  ],
  "Membership administration (Private)": [
    {
      "value": "Problem logging in",
      "label": "Problem bei der Anmeldung"
    },
    {
      "value": "Adjust my plan (Private)",
      "label": "Meinen Tarif anpassen (Privat)"
    },
    {
      "value": "Discounts/Coupons",
      "label": "Rabatte /Gutscheine"
    },
    {
      "value": "Question about cancellation",
      "label": "Frage zur Kündigung"
    },
    {
      "value": "Payment/Invoices",
      "label": "Zahlung / Rechnungen"
    },
    {
      "value": "Pause my membership",
      "label": "Meine Mitgliedschaft pausieren"
    },
    {
      "value": "Update personal information",
      "label": "Persönliche Daten aktualisieren"
    },
    {
      "value": "My membership start date",
      "label": "Startdatum meiner Mitgliedschaft"
    },
    {
      "value": "Other",
      "label": "Sonstiges"
    }
  ],
  "General question": [
    {
      "value": "I need to contact a department",
      "label": "Ich benötige Kontakt zu einer Abteilung"
    },
    {
      "value": "Data protection",
      "label": "Datenschutz"
    },
    {
      "value": "Technical problems",
      "label": "Technische Probleme"
    },
    {
      "value": "Feedback about the app or website",
      "label": "Feedback zu App oder Webseite"
    },
    {
      "value": "I want to reactivate my membership",
      "label": "Ich möchte meine Mitgliedschaft reaktivieren"
    },
    {
      "value": "Questions before logging in/becoming a member",
      "label": "Fragen vor der Anmeldung/ Mitglied werden"
    },
    {
      "value": "Other",
      "label": "Sonstiges"
    }
  ],
  "Partner-related question": [
    {
      "value": "Cashback",
      "label": "Cashback"
    },
    {
      "value": "Reservation problems",
      "label": "Probleme bei der Reservierung"
    },
    {
      "value": "Live courses/Online courses",
      "label": "Live-Kurse / Online-Kurse"
    },
    {
      "value": "Information about a specific partner",
      "label": "Informationen über einen bestimmten Partner"
    },
    {
      "value": "Find partners in our app",
      "label": "Partner in unserer App finden"
    },
    {
      "value": "Check-in management",
      "label": "Check-In Management"
    },
    {
      "value": "Other",
      "label": "Sonstiges"
    }
  ]
}

export const SHORT_DESCRIPTIONS_BY_TOPIC: Record<string, SalesforceOption[]> = {
  "Problem logging in": [
    {
      "value": "Ich kann mich in die App nicht einloggen",
      "label": "Ich kann mich in die App nicht einloggen"
    },
    {
      "value": "Ich habe keinen Link zum Zurücksetzen meines Passwortes bekommen",
      "label": "Ich habe keinen Link zum Zurücksetzen meines Passwortes bekommen"
    },
    {
      "value": "Ich kann meine Mitgliedschaft nicht verbinden",
      "label": "Ich kann meine Mitgliedschaft nicht verbinden"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Adjust my plan (Private)": [
    {
      "value": "Ich möchte zu einer Firmenmitgliedschaft wechseln",
      "label": "Ich möchte zu einer Firmenmitgliedschaft wechseln"
    },
    {
      "value": "Ich möchte meine Privatmitgliedschaft downgraden",
      "label": "Ich möchte meine Privatmitgliedschaft downgraden"
    },
    {
      "value": "Ich möchte meine Privatmitgliedschaft upgraden",
      "label": "Ich möchte meine Privatmitgliedschaft upgraden"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Adjust my plan (Corporate)": [
    {
      "value": "Ich möchte zu einer Privatmitgliedschaft wechseln",
      "label": "Ich möchte zu einer Privatmitgliedschaft wechseln"
    },
    {
      "value": "Ich wechsle meinen aktuellen Arbeitgeber",
      "label": "Ich wechsle meinen aktuellen Arbeitgeber"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Discounts/Coupons": [
    {
      "value": "Corporate Benefits / Mitarbeitervorteile",
      "label": "Corporate Benefits / Mitarbeitervorteile"
    },
    {
      "value": "Ich habe ein Problem, einen aktuellen Rabatt betreffend",
      "label": "Ich habe ein Problem, einen aktuellen Rabatt betreffend"
    },
    {
      "value": "Information über Family&Friends",
      "label": "Information über Family&Friends"
    },
    {
      "value": "Wie sehen die Konditionen meiner Mitgliedschaft aus",
      "label": "Wie sehen die Konditionen meiner Mitgliedschaft aus"
    },
    {
      "value": "Geschenkgutscheine",
      "label": "Geschenkgutscheine"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Corporate rates": [
    {
      "value": "Corporate Benefits / Mitarbeitervorteile",
      "label": "Corporate Benefits / Mitarbeitervorteile"
    },
    {
      "value": "Information über Family&Friends",
      "label": "Information über Family&Friends"
    },
    {
      "value": "Wie sehen die Konditionen meiner Mitgliedschaft aus",
      "label": "Wie sehen die Konditionen meiner Mitgliedschaft aus"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Question about cancellation": [
    {
      "value": "Ich wechsle meinen aktuellen Arbeitgeber",
      "label": "Ich wechsle meinen aktuellen Arbeitgeber"
    },
    {
      "value": "Ich habe gekündigt, aber mir wurde ein Betrag abgebucht",
      "label": "Ich habe gekündigt, aber mir wurde ein Betrag abgebucht"
    },
    {
      "value": "Wie kündige ich eine Mitgliedschaft?",
      "label": "Wie kündige ich eine Mitgliedschaft?"
    },
    {
      "value": "Wie widerrufe ich meine Mitgliedschaft?",
      "label": "Wie widerrufe ich meine Mitgliedschaft?"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Payment/Invoices": [
    {
      "value": "Meine Mitgliedschaft wurde gesperrt",
      "label": "Meine Mitgliedschaft wurde gesperrt"
    },
    {
      "value": "Ich habe eine Zahlung versäumt",
      "label": "Ich habe eine Zahlung versäumt"
    },
    {
      "value": "Mir wurde der falsche Betrag abgebucht/ in Rechnung gestellt",
      "label": "Mir wurde der falsche Betrag abgebucht/ in Rechnung gestellt"
    },
    {
      "value": "Allgemeine Fragen zu Zahlungen/Rechnungen",
      "label": "Allgemeine Fragen zu Zahlungen/Rechnungen"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Pause my membership": [
    {
      "value": "Ich möchte meine Mitgliedschaft pausieren",
      "label": "Ich möchte meine Mitgliedschaft pausieren"
    },
    {
      "value": "Ich möchte meine Pause aufheben",
      "label": "Ich möchte meine Pause aufheben"
    },
    {
      "value": "Ich möchte eine Änderung meiner Pause beantragen",
      "label": "Ich möchte eine Änderung meiner Pause beantragen"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Update personal information": [
    {
      "value": "Adresse/ Telefonnummer ändern",
      "label": "Adresse/ Telefonnummer ändern"
    },
    {
      "value": "Name oder E-Mail ändern",
      "label": "Name oder E-Mail ändern"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    },
    {
      "value": "Bankverbindung ändern",
      "label": "Bankverbindung ändern"
    }
  ],
  "My membership start date": [
    {
      "value": "Anmeldebestätigung",
      "label": "Anmeldebestätigung"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "I need to contact a department": [
    {
      "value": "Personalabteilung",
      "label": "Personalabteilung"
    },
    {
      "value": "Marketing",
      "label": "Marketing"
    },
    {
      "value": "Customer Service",
      "label": "Customer Service"
    },
    {
      "value": "Firmen Management",
      "label": "Firmen Management"
    },
    {
      "value": "Partner (Success) Management",
      "label": "Partner (Success) Management"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Data protection": [
    {
      "value": "Allgemeine Datenbestandsabfragen",
      "label": "Allgemeine Datenbestandsabfragen"
    },
    {
      "value": "Allgemeine Anfrage / Sonstiges",
      "label": "Allgemeine Anfrage / Sonstiges"
    },
    {
      "value": "Antrag auf Berichtigung der Daten",
      "label": "Antrag auf Berichtigung der Daten"
    },
    {
      "value": "Antrag auf Lösung der Daten / Einschränkung der Verarbeitung",
      "label": "Antrag auf Lösung der Daten / Einschränkung der Verarbeitung"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Technical problems": [
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Feedback about the app or website": [
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "I want to reactivate my membership": [
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Questions before logging in/becoming a member": [
    {
      "value": "Unterschied Privat/Firmenmitgliedschaft",
      "label": "Unterschied Privat/Firmenmitgliedschaft"
    },
    {
      "value": "Wie melde ich mich an?",
      "label": "Wie melde ich mich an?"
    },
    {
      "value": "Wie funktioniert Sportnavi?",
      "label": "Wie funktioniert Sportnavi?"
    },
    {
      "value": "Wie kann ich mich über meine  Arbeitgeber /Verein etc. anmelden",
      "label": "Wie kann ich mich über meine  Arbeitgeber /Verein etc. anmelden"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Cashback": [
    {
      "value": "Wie funktioniert es?",
      "label": "Wie funktioniert es?"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Reservation problems": [
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Live courses/Online courses": [
    {
      "value": "Wie funktioniert es?",
      "label": "Wie funktioniert es?"
    },
    {
      "value": "Ich habe technische Probleme",
      "label": "Ich habe technische Probleme"
    },
    {
      "value": "Ich habe keine E-Mail mit dem Link erhalten",
      "label": "Ich habe keine E-Mail mit dem Link erhalten"
    },
    {
      "value": "Kurse vor Ort",
      "label": "Kurse vor Ort"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Information about a specific partner": [
    {
      "value": "Informationen bezüglich des Partnerprofils",
      "label": "Informationen bezüglich des Partnerprofils"
    },
    {
      "value": "Erfahrung bei einem Partner",
      "label": "Erfahrung bei einem Partner"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Find partners in our app": [
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Check-in management": [
    {
      "value": "Ich kann mich nicht einchecken",
      "label": "Ich kann mich nicht einchecken"
    },
    {
      "value": "Ich möchte einen Check-In hinzufügen",
      "label": "Ich möchte einen Check-In hinzufügen"
    },
    {
      "value": "Ich möchte die App auf einem anderen Endgerät nutzen",
      "label": "Ich möchte die App auf einem anderen Endgerät nutzen"
    },
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ],
  "Other": [
    {
      "value": "Sonstiges",
      "label": "Sonstiges"
    }
  ]
}
