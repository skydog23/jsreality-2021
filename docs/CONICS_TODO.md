
##Development related to the Penrose cube software

Rendering/appearance features
    - devise tube radius to depend on viewport size, to preserve screen-space width
    - create one appearance for each different class of conics in the full diagram and only set the color in the leaf appearance.
    - use texturing on the tubing to simulate different line-styles (dotted,  dashed, etc.

Animation
    - Figure out out to animate the aij's and the di's. 

Mathematical issues
    - Tolerance issues
        Deciding when to "round off" a rank-3 conic  to a rank-2 or rank-1 conic.
            There is a difference between tolerances for the SVD for finding a conic from 5 points, and that for SVD for a 3x3 quadratic form Q.
            For example, it appears that T0 is currently needing a smaller Q-tolerance, but that smaller tolerance introduces other problems for other elements of the Penrose cube.
     - port over from Java the repn of P2 as two copies on the unit sphere and apply it to visualize Penrose configs.
     - begin to consider how to handle dual conics. 
        In the current pointwise-only code, it's impossible to converge to a point pair -- it just jumps to a double line (is this true?) 
        Solutiom: when (point-wise) SVD reveals reduced rank, compute also the line SVD analyss.  

     - Deal with completely imaginary conics. 
        Simple test: <\omega, \omega^\perp> > 0, that is the evaluation map of the ideal line and its polar point is positive.


Non-Penrose To-do list

*Dualize SceneGraph* 
    Translate the "dualize scene graph" code
*Clean up Rn*
    Clean up Rn to make the rules stricter. Ask for a report on cost of removing the first argument or moving it to be the last, optional argument (so it can be left out). (That applies to Pn, P3, P2, and other such static classes).
*How should square matrices be handled?*
    While we're cleaning things up, consider whether it makes sense in the interest of "outside adopters" to normalize the handling of square matrices to use geneuine 2D arrays.  Maybe generate a completely new branch to test this since it is so ubiquitous in  the code.  I see no good reason to maintain this oddity.
*InputSlot report*
    Ask the AI to go through the jreality tool system and generate a list of the InputSlots along with their transformations, if they have one.
*Clear up Tool activation issues*
*Translate the animation/src/tutorial class AnimatedJRViewer.*


 