// Class dad names from the Kappa Pi Beta Master Binder, grouped by campus and crossing class.
const classDadsBySchool = [
  {
    "Fall 2000|ALPHA CLASS": [
      "Christopher Flores"
    ],
    "Spring 2001|BETA CLASS": [
      "Alfred Gozun"
    ],
    "Fall 2001|GAMMA CLASS": [
      "Sean Orquiola"
    ],
    "Spring 2002|DELTA CLASS": [
      "Phillip Gozun"
    ],
    "Fall 2002|EPSILON CLASS": [
      "Noel Nicholas Daguio"
    ],
    "Fall 2003|ZETA CLASS": [
      "Dexter San Gabriel"
    ],
    "Fall 2004|ETA CLASS": [
      "Jessie Bayani"
    ],
    "Spring 2005|THETA CLASS": [
      "Robert Gregorio"
    ],
    "Fall 2005|IOTA CLASS": [
      "Godwin Flores"
    ],
    "Spring 2006|KAPPA CLASS": [
      "Richmond Lim"
    ],
    "Fall 2006|LAMBDA CLASS": [
      "Leal Musni"
    ],
    "Spring 2007|MU CLASS": [
      "Jeremy Anasco"
    ],
    "Fall 2007|NU CLASS": [
      "Edgar Harima"
    ],
    "Fall 2008|XI CLASS": [
      "Carlo Buscar"
    ],
    "Fall 2009|OMICRON CLASS": [
      "Robert Menor"
    ],
    "Fall 2010|POWERHOUSE PI CLASS": [
      "Henry Chong"
    ],
    "Fall 2011|RECKLESS RHO CLASS": [
      "Alexis Gatica"
    ],
    "Spring 2012|SIGMA SOLDIERS CLASS": [
      "Michael Wong"
    ],
    "Fall 2012|TITAN TAU CLASS": [
      "Nate Wong"
    ],
    "Fall 2013|UNDEFEATED UPSILON CLASS": [
      "Jose Anaya"
    ],
    "Spring 2014|PHENOM PHI CLASS": [
      "Christopher Galera"
    ],
    "Fall 2014|CHAOTIC CHI CLASS": [
      "Somprasong Yuttapibol"
    ],
    "Fall 2015|PSYCHOTIC PSI CLASS": [
      "Kevin Patarabunluaphob"
    ],
    "Fall 2016|OMEGA OMEN CLASS": [
      "Michael Belbis"
    ],
    "Fall 2017|ASCENDED ALPHA ALPHA CLASS": [
      "Edwin Li"
    ],
    "Fall 2018|ALPHA BETA BREAKTHROUGH CLASS": [
      "Emanuel Morales"
    ],
    "Spring 2019|ALPHA GAMMA GUARDS CLASS": [
      "Rayne Yap",
      "Alexis Soule"
    ],
    "Spring 2020|ALPHA EPSILON EVOLUTION CLASS": [
      "Sergio Guzman"
    ],
    "Fall 2021|ALPHA ZETA ZEALOTS CLASS": [
      "Juan Navarro"
    ],
    "Spring 2023|ALPHA ETA ELITEZ CLASS": [
      "Edwin Arambula"
    ],
    "Fall 2023|ALPHA THETA TAERU CLASS": [
      "Ryan Chanthavong"
    ],
    "Fall 2024|ALPHA IOTA INVINCIBLE CLASS": [
      "Ralph Aloya"
    ],
    "Spring 2025|ALPHA KAPPA KATALYST CLASS": [
      "Brandon Ngai"
    ],
    "Fall 2025|ALPHA LAMBDA LIMITLESS CLASS": [
      "Seth Whalen"
    ],
    "Fall 2026|ALPHA MU MILLENNIUM CLASS": [
      "Luis Carrasco"
    ]
  },
  {
    "Fall 2008|C.H.A.M.P.I.O.N. Charter Class": [
      "Ricky Chen"
    ],
    "Spring 2009|A.D.V.E.N.T. Alpha Class": [
      "Edmar Viloria"
    ],
    "Fall 2010|B.O.S.S. Beta Class": [
      "Daniel Kim"
    ],
    "Spring 2011|G.U.A.R.D.I.A.N. Gamma Class": [
      "Stefan Murakami"
    ],
    "Fall 2011|D.I.A. Delta Class": [
      "William Lui"
    ],
    "Fall 2012|E.L.I.T.E. Epsilon Class": [
      "Wataru Inoue"
    ],
    "Fall 2013|Z.E.O. Zeta Class": [
      "Alan Alcesto"
    ],
    "Fall 2014|Eta E.M.P.I.R.E. Class": [
      "John Raymond “J.R.” Ellasos"
    ],
    "Fall 2015|Theta T.Y.R.A.N.T.S. Class": [
      "Norman Chen"
    ],
    "Fall 2016|I.N.F.A.M.O.U.S. Iota Class": [
      "Brandon Torres"
    ],
    "Spring 2017|Kappa K.I.N.G.D.O.M. Class": [
      "Kerr Evangelista"
    ],
    "Fall 2017|Lambda L.E.G.I.O.N. Class": [
      "James Vuong"
    ],
    "Spring 2018|Mu M.A.S.T.E.R.P.I.E.C.E. Class": [
      "Lester Dela Cruz"
    ],
    "Fall 2018|Nu N.E.X.U.S. Class": [
      "Muhamad Abdullah “Abie” Yanuardi"
    ],
    "Spring 2019|Xi X-F.A.C.T.O.R. Class": [
      "Eddie Bae"
    ],
    "Fall 2019|O.S.I.R.I.S. Omicron Class": [
      "Mashbat Otgontsagaan"
    ],
    "Spring 2020|Phantom Pi Class": [
      "David Won"
    ],
    "Spring 2021|R.E.S.I.L.I.E.N.T. Rho Class": [
      "Alejandro Perez"
    ],
    "Fall 2021|SIN.I.S.T.É.R. Sigma Class": [
      "Julian Yu"
    ],
    "Fall 2022|T.E.M.P.E.S.T. TAU CLASS": [
      "Tyler Andrle"
    ],
    "Spring 2023|UN.DYING UPSILON CLASS": [
      "Nicky Zhu"
    ],
    "Fall 2023|P.R.ESTIGE Phi Class": [
      "Ryo Wong"
    ],
    "Spring 2024|C.A.L.A.M.I.T.Y. Chi Class": [
      "Alvin Phuong"
    ],
    "Fall 2024|P.A.L.A.D.I.N. PSI Class": [
      "Brendin Lam"
    ],
    "Fall 2025|Omega O.D.Y.S.S.E.Y. Class": [
      "Ryan Chan"
    ],
    "Spring 2026|Alpha Alpha A.S.C.Σ.N.S.I.Ø.N Class": [
      "Caleb Yin"
    ]
  },
  {
    "Fall 2013|COLOSSAL Charter Class": [
      "Kevin Anthony Moy"
    ],
    "Fall 2014|ATOMIC Alpha Class": [
      "Vincent Su"
    ],
    "Fall 2015|BERSERK Beta Class": [
      "Phillip Nguyen"
    ],
    "Spring 2016|The Game Changer Gamma Class": [
      "John Hu"
    ],
    "Fall 2016|D.E.F.C.O.N. Delta Class": [
      "Chuan Yi Li"
    ],
    "Spring 2018|ELUSIVE Epsilon Class": [
      "Jonathan Gill"
    ],
    "Fall 2018|Zeta ZENith Class": [
      "Aidan Brooks"
    ],
    "Spring 2019|EtheREAL Eta Class": [
      "Royal Sanders"
    ],
    "Fall 2019|Theta {Theory;} Class": [
      "Daniel Gray"
    ],
    "Fall 2020|Indestructible Iota Class": [
      "Johan Ro"
    ],
    "Fall 2021|Kappa Kenpo Class": [
      "Henri Ho"
    ],
    "Spring 2023|The Lambent Lambda Class": [
      "Anand Kulkarni"
    ]
  },
  {
    "Spring 2018|Catalytic Charter Class": [
      "Dexter Teng"
    ],
    "Fall 2018|Alpha Allegiant Class": [
      "Christopher Marvin Vinzons"
    ],
    "Spring 2019|Beta Bastions Class": [
      "Reymar De Leon"
    ],
    "Fall 2019|Gamma Genesis Class": [
      "Edward Thai"
    ],
    "Spring 2020|Dauntless Delta Class": [
      "Tommy Mai"
    ],
    "Spring 2021|Eternal Epsilon Class": [
      "Jared-Peter Lavengco"
    ],
    "Fall 2021|Zeta Zeno Class": [
      "Timothy Khuu"
    ],
    "Spring 2022|Eta Endeavor Class": [
      "Gene Lee"
    ],
    "Fall 2022|Theta Tenacity Class": [
      "Johnny Park"
    ],
    "Spring 2023|Immortal Iota Class": [
      "Tien Tran"
    ],
    "Fall 2023|Kappa Kairos Class": [
      "Andrew Jo"
    ],
    "Spring 2024|Lambda Luminare Class": [
      "Isaac Lo"
    ],
    "Fall 2024|Mugen Mu Class": [
      "Kevo Truong"
    ],
    "Spring 2025|Nu Nemesis Class": [
      "Clement Wang"
    ],
    "Fall 2025|Xi Xiphos Class": [
      "Daren Buendicho"
    ],
    "Spring 2026|Omicron Oasis Class": [
      "Ethan Moraleda"
    ],
    "Fall 2026|Pi Pyros Class": [
      "Alexander Yabes"
    ]
  },
  {
    "Fall 2019|Charter C.O.N.Q.U.E.S.T. Class": [
      "Kenneth Yap"
    ],
    "Spring 2020|Alpha A.C.E.S. Class": [
      "Allen Tang"
    ],
    "Fall 2020|Beta B.L.I.T.Z. Class": [
      "William “Liam” Atkinson"
    ],
    "Spring 2021|GAMMA G.A.M.B.I.T CLASS": [
      "Kevin “Archangel” Nguyen"
    ],
    "Fall 2021|Delta D.Y.N.A.S.T.Y CLASS": [
      "Anthony Phan"
    ],
    "Spring 2022|Epsilon E.C.L.I.P.S.E. Class": [
      "David Phan"
    ],
    "Spring 2023|Zeta Z.E.P.H.Y.R.S. Class": [
      "Brendan Nguyen"
    ],
    "Fall 2023|Eta E.X.O.D.U.S Class": [
      "Aurin Dutta"
    ],
    "Spring 2024|Theta T.R.I.U.M.P.H. Class": [
      "Nicolas Beguin"
    ],
    "Fall 2024|Iota I.M.P.A.C.T. Class": [
      "Ukana Odpurev"
    ],
    "Spring 2025|Kappa K.A.I.Z.E.N. Class": [
      "Douglas Edward Gaudia Turner"
    ],
    "Fall 2025|Lambda L.E.G.A.C.Y. Class": [
      "Darren Teshiba"
    ],
    "Spring 2026|Mu M.I.R.A.I. Class": [
      "Thomas Cheng"
    ]
  },
  {
    "Fall 2024|C.H.I.V.A.L.R.O.U.S. Charter Class": [
      "Deepesh Patel"
    ],
    "Spring 2025|ALPHA CLASS": [
      "Shubham Nigam"
    ],
    "Spring 2026|B.EAK.ON Beta Class": [
      "Sandeep Valmiki"
    ],
    "Spring 2026|G.E.N Gamma Class": [
      "Evan Yang"
    ]
  },
  {
    "Fall 2013|Charter Class": [
      "George Joseph"
    ]
  }
];

// Binder spellings and nicknames that differ from the verified roster display name.
const classDadAliases = {
  "Noel Nicholas Daguio": "Noel Daguio",
  "Somprasong Yuttapibol": "Somprasong Yuttapibool",
  "John Raymond “J.R.” Ellasos": "John Ellasos",
  "Norman Chen": "Wen Chen",
  "Muhamad Abdullah “Abie” Yanuardi": "Muhamad Yanuardi",
  "Nicky Zhu": "Chu Zhu",
  "Kevin Anthony Moy": "Kevin Moy",
  "Chuan Yi Li": "Chuan Li",
  "Christopher Marvin Vinzons": "Christopher Vinzons",
  "Johnny Park": "Cheoneui Park",
  "Kevo Truong": "Kevin Truong",
  "William “Liam” Atkinson": "William Atkinson",
  "Kevin “Archangel” Nguyen": "Kevin Nguyen",
  "Ukana Odpurev": "Uugan Odpurev",
  "Douglas Edward Gaudia Turner": "Douglas Turner"
};
