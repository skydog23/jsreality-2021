/**
 * Embedded kbmag word-acceptor (.wa) data for Platycosm groups.
 *
 * These define finite state automata that accept exactly the set of
 * canonical (shortlex-reduced) words for each group, enabling fast
 * rejection of non-canonical words during element enumeration.
 *
 * Source: de/jtem/discretegroup/resources/wa/*.wa (kbmag output)
 */

export const platycosmWaData = new Map([
  ['c1', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [a,A,b,B,c,C]
               ),
          states := rec(
                type := "simple",
                size := 7
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..7],
           table := rec(
              format := "dense deterministic",
      numTransitions := 24,
         transitions := [[2,3,4,5,6,7],
                         [2,0,4,5,6,7],
                         [0,3,4,5,6,7],
                         [0,0,4,0,6,7],
                         [0,0,0,5,6,7],
                         [0,0,0,0,6,0],
                         [0,0,0,0,0,7]
                        ]
               )
);`],

  ['c2', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [A,a,c,C,B,b]
               ),
          states := rec(
                type := "simple",
                size := 7
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..7],
           table := rec(
              format := "dense deterministic",
      numTransitions := 24,
         transitions := [[2,3,4,5,6,7],
                         [2,0,4,5,6,7],
                         [0,3,4,5,6,7],
                         [0,0,4,0,6,7],
                         [0,0,0,5,6,7],
                         [0,0,0,0,6,0],
                         [0,0,0,0,0,7]
                        ]
               )
);`],

  ['c3', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [A,a,c,C,B,b]
               ),
          states := rec(
                type := "simple",
                size := 12
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..12],
           table := rec(
              format := "dense deterministic",
      numTransitions := 45,
         transitions := [[2,3,4,5,6,7],
                         [2,0,4,5,6,7],
                         [0,3,4,5,6,7],
                         [8,9,4,0,6,7],
                         [10,11,0,5,0,0],
                         [0,0,0,5,6,0],
                         [0,0,0,5,0,7],
                         [8,0,4,0,6,7],
                         [0,9,4,0,6,7],
                         [10,0,12,5,0,0],
                         [0,11,12,5,0,0],
                         [0,0,4,0,6,7]
                        ]
               )
);`],

  ['c4', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [A,a,c,C,B,b]
               ),
          states := rec(
                type := "simple",
                size := 13
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..13],
           table := rec(
              format := "dense deterministic",
      numTransitions := 34,
         transitions := [[2,3,4,5,6,7],
                         [2,0,4,5,6,7],
                         [0,3,4,5,6,7],
                         [8,9,10,0,0,0],
                         [11,12,0,13,0,0],
                         [0,0,0,0,6,0],
                         [0,0,0,0,0,7],
                         [8,0,10,0,0,0],
                         [0,9,10,0,0,0],
                         [0,0,10,0,0,0],
                         [11,0,0,13,0,0],
                         [0,12,0,13,0,0],
                         [0,0,0,13,0,0]
                        ]
               )
);`],

  ['c6', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [A,a,c,C,B,b]
               ),
          states := rec(
                type := "simple",
                size := 40
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..40],
           table := rec(
              format := "dense deterministic",
      numTransitions := 98,
         transitions := [[2,3,4,5,6,7],
                         [8,0,9,10,11,12],
                         [0,13,14,15,16,17],
                         [18,19,20,0,21,22],
                         [23,24,0,25,0,0],
                         [0,0,0,26,6,0],
                         [0,0,0,27,0,7],
                         [28,0,9,10,11,12],
                         [29,0,30,0,0,22],
                         [31,0,0,32,0,0],
                         [0,0,0,33,11,0],
                         [0,0,0,0,0,12],
                         [0,34,14,15,16,17],
                         [0,30,29,0,21,0],
                         [0,32,0,31,0,0],
                         [0,0,0,0,16,0],
                         [0,0,0,33,0,17],
                         [18,0,29,0,21,0],
                         [0,19,30,0,0,22],
                         [29,30,35,0,0,0],
                         [0,0,0,0,36,0],
                         [0,0,0,0,0,37],
                         [23,0,0,31,0,0],
                         [0,24,0,32,0,0],
                         [31,32,0,38,0,0],
                         [0,26,0,0,0,0],
                         [27,0,0,0,0,0],
                         [28,0,9,10,11,39],
                         [29,0,35,0,0,0],
                         [0,30,35,0,0,0],
                         [31,0,0,38,0,0],
                         [0,32,0,38,0,0],
                         [0,0,0,0,0,0],
                         [0,34,14,15,40,17],
                         [0,0,35,0,0,0],
                         [0,0,0,0,11,0],
                         [0,0,0,0,0,17],
                         [0,0,0,38,0,0],
                         [0,0,0,0,0,33],
                         [0,0,0,0,33,0]
                        ]
               )
);`],

  ['c22', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 12,
              format := "dense",
               names := [d,D,A,a,F,c,f,C,B,b,E,e]
               ),
          states := rec(
                type := "simple",
                size := 42
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..42],
           table := rec(
              format := "dense deterministic",
      numTransitions := 122,
         transitions := [[2,3,4,5,6,7,8,9,10,11,12,13],
                         [14,0,0,15,0,7,0,9,10,0,12,13],
                         [0,16,0,17,18,0,8,9,19,0,0,0],
                         [0,0,0,0,4,0,0,0,10,11,0,13],
                         [0,0,0,20,18,21,0,9,10,0,0,13],
                         [22,0,0,0,4,0,0,0,10,11,0,13],
                         [23,0,24,0,0,0,0,0,0,0,12,13],
                         [25,0,0,0,0,0,0,0,0,0,12,0],
                         [0,26,27,0,0,0,0,0,0,0,0,0],
                         [0,0,0,28,0,0,29,0,0,0,0,0],
                         [0,0,30,0,0,0,29,0,0,0,0,0],
                         [0,0,0,0,0,0,29,0,0,0,0,0],
                         [0,0,0,0,31,0,0,0,0,0,0,0],
                         [14,0,0,0,0,32,0,0,0,0,12,13],
                         [0,0,0,20,18,33,0,9,19,0,0,0],
                         [0,16,0,0,34,0,8,35,0,0,0,0],
                         [0,0,0,0,0,21,0,0,10,0,0,13],
                         [22,0,0,0,0,0,0,0,0,11,0,13],
                         [0,0,0,36,0,0,0,0,0,0,0,0],
                         [0,0,0,20,0,33,0,9,19,0,0,0],
                         [17,0,24,0,0,0,0,0,0,0,12,0],
                         [0,0,0,37,0,34,0,0,0,0,12,0],
                         [0,0,0,0,0,7,0,0,10,0,12,13],
                         [0,0,0,0,28,0,0,0,0,38,0,0],
                         [0,0,0,0,0,8,0,0,0,0,0,13],
                         [0,0,0,0,0,0,0,9,19,0,0,0],
                         [0,0,0,0,0,0,0,0,0,38,0,0],
                         [0,0,0,0,0,0,0,0,10,0,0,13],
                         [0,0,0,0,0,0,0,0,0,0,12,0],
                         [0,0,0,0,0,0,0,0,0,11,0,13],
                         [0,0,0,0,0,0,0,0,0,0,0,13],
                         [39,0,0,0,0,0,0,0,0,0,12,13],
                         [40,0,27,0,0,0,0,0,0,0,0,0],
                         [41,0,0,0,0,0,0,0,0,0,0,13],
                         [0,42,0,0,0,0,0,0,0,0,0,0],
                         [0,0,0,0,0,0,0,0,19,0,0,0],
                         [0,0,0,0,18,0,0,9,19,0,0,0],
                         [0,0,27,0,0,0,0,0,0,0,0,0],
                         [0,0,0,0,0,32,0,0,0,0,12,13],
                         [0,0,0,0,0,33,0,0,19,0,0,0],
                         [0,0,0,0,0,34,0,0,0,0,12,0],
                         [0,0,0,0,0,0,0,35,0,0,0,0]
                        ]
               )
);`],

  ['+a1', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [A,a,c,C,B,b]
               ),
          states := rec(
                type := "simple",
                size := 7
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..7],
           table := rec(
              format := "dense deterministic",
      numTransitions := 24,
         transitions := [[2,3,4,5,6,7],
                         [2,0,4,5,6,7],
                         [0,3,4,5,6,7],
                         [0,0,4,0,6,7],
                         [0,0,0,5,6,7],
                         [0,0,0,0,6,0],
                         [0,0,0,0,0,7]
                        ]
               )
);`],

  ['-a1', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [A,a,c,C,B,b]
               ),
          states := rec(
                type := "simple",
                size := 13
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..13],
           table := rec(
              format := "dense deterministic",
      numTransitions := 34,
         transitions := [[2,3,4,5,6,7],
                         [2,0,4,5,6,7],
                         [0,3,4,5,6,7],
                         [8,9,10,0,0,0],
                         [11,12,0,13,0,0],
                         [0,0,0,0,6,0],
                         [0,0,0,0,0,7],
                         [8,0,10,0,0,0],
                         [0,9,10,0,0,0],
                         [0,0,10,0,0,0],
                         [11,0,0,13,0,0],
                         [0,12,0,13,0,0],
                         [0,0,0,13,0,0]
                        ]
               )
);`],

  ['+a2', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [A,a,c,C,B,b]
               ),
          states := rec(
                type := "simple",
                size := 31
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..31],
           table := rec(
              format := "dense deterministic",
      numTransitions := 64,
         transitions := [[2,3,4,5,6,7],
                         [2,0,8,9,6,7],
                         [0,3,10,11,12,13],
                         [0,0,4,0,14,15],
                         [0,0,0,5,16,17],
                         [0,0,18,19,12,0],
                         [0,0,20,21,0,13],
                         [0,0,22,0,0,0],
                         [0,0,0,23,0,0],
                         [0,0,8,0,14,15],
                         [0,0,0,9,16,17],
                         [0,0,0,0,12,0],
                         [0,0,0,0,0,13],
                         [0,0,18,0,12,0],
                         [0,0,20,0,0,13],
                         [0,0,0,19,12,0],
                         [0,0,0,21,0,13],
                         [0,0,0,0,0,15],
                         [0,0,0,0,0,17],
                         [0,0,0,0,14,0],
                         [0,0,0,0,16,0],
                         [0,0,8,0,24,25],
                         [0,0,0,9,26,27],
                         [0,0,28,0,0,0],
                         [0,0,29,0,0,0],
                         [0,0,0,30,0,0],
                         [0,0,0,31,0,0],
                         [0,0,0,0,0,25],
                         [0,0,0,0,24,0],
                         [0,0,0,0,0,27],
                         [0,0,0,0,26,0]
                        ]
               )
);`],

  ['-a2', `_RWS.wa := rec(
           isFSA := true,
        alphabet := rec(
                type := "identifiers",
                size := 6,
              format := "dense",
               names := [A,a,c,C,B,b]
               ),
          states := rec(
                type := "simple",
                size := 7
               ),
           flags := ["DFA","minimized","BFS","accessible","trim"],
         initial := [1],
       accepting := [1..7],
           table := rec(
              format := "dense deterministic",
      numTransitions := 24,
         transitions := [[2,3,4,5,6,7],
                         [2,0,4,5,6,7],
                         [0,3,4,5,6,7],
                         [0,0,4,0,6,7],
                         [0,0,0,5,6,7],
                         [0,0,0,0,6,0],
                         [0,0,0,0,0,7]
                        ]
               )
);`],
]);
