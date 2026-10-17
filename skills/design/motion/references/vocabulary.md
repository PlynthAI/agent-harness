# Motion vocabulary

Adapted from the `animation-vocabulary` method in emilkowalski/skills at commit
`85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` (MIT).

A reverse lookup: it turns a described sensation into the precise term, so the
same effect can be asked for, specified or reviewed by name. Read for intent
rather than for keywords - people describe what they see or feel, not the
technical name - and answer with the term first, then at most one or two close
alternates with the difference between them stated in a line.

When nothing in the list matches exactly, name the closest term and say plainly
that it is an approximation, or describe the effect using these words. Do not
invent a term. A naming question wants a name, not an essay.

## Entrances and exits

- **Fade in / out** - appears or disappears by opacity alone.
- **Slide in** - enters from off-screen.
- **Scale in** - grows from smaller to full size, usually with a fade.
- **Pop in** - appears with a slight overshoot.
- **Reveal** - uncovered gradually by a clip or mask.
- **Enter / exit** - the animation played when an element is added or removed.

## Sequencing and timing

- **Keyframes** - defined points the browser fills in between.
- **Interpolation / tween** - generating the in-between frames.
- **Stagger** - several items animated in sequence with a small delay each.
- **Orchestration** - deliberately timing several animations as one motion.
- **Delay**, **duration** - before it starts, and how long it runs.
- **Fill mode** - whether the first or last frame's styles survive before or
  after the animation.
- **Stepped animation** - divided into discrete steps, like a countdown.

## Movement and transforms

- **Translate**, **scale**, **rotate**, **skew** - position, size, angle, slant.
- **3D tilt / flip** - rotation in 3D space, with **perspective** setting how
  strong it reads.
- **Transform origin** - the anchor a scale or rotation works from.
- **Origin-aware animation** - an element animates out of the trigger that opened
  it rather than out of its own centre.

## Transitions between states

- **Crossfade** - one element fades out as another fades in, in the same place.
- **Continuity transition** - a change that keeps the user oriented by connecting
  before and after visually.
- **Morph** - one shape smoothly becoming another.
- **Shared element transition** - an element travels and transforms from one
  position into another.
- **Layout animation** - a size or position change animates instead of snapping.
- **Accordion / collapse** - a section expands or collapses its height.
- **Direction-aware transition** - content moves one way going forward and the
  opposite way going back.

## Scroll

- **Scroll reveal** - elements fade or slide in as they enter the viewport.
- **Scroll-driven animation** - progress tied directly to scroll position.
- **Parallax** - foreground and background moving at different speeds.
- **Page transition**, **view transition** - playing on navigation, or morphing
  between two states while connecting shared elements.

## Feedback and interaction

- **Hover effect**, **press / tap feedback** - the response to a pointer, with
  press feedback usually a small scale-down.
- **Hold to confirm** - a progress effect filling while a control is held.
- **Drag**, **drag to reorder**, **swipe to dismiss** - moving, rearranging and
  dismissing by pointer.
- **Rubber-banding** - resistance and snap-back past a boundary.
- **Shake / wiggle** - a quick jitter signalling rejection.
- **Ripple** - a circle expanding from the point of a tap.

## Easing

- **Easing** - how the rate changes over the animation.
- **Ease-out** - starts fast, ends slow; the default for interface motion and for
  anything responding to the user.
- **Ease-in** - starts slow; usually avoided because it feels sluggish.
- **Ease-in-out** - slow, fast, slow; for something already on screen moving from
  one place to another.
- **Linear** - constant speed; for spinners and marquees rather than interface
  motion.
- **Cubic-bezier** - a custom curve, and **asymmetric easing** - one that
  accelerates and decelerates at different rates, which usually feels more alive.

## Springs

- **Spring** - motion driven by physics rather than a set duration.
- **Stiffness / tension**, **damping**, **mass** - how hard it pulls, how quickly
  it settles, and how heavy it feels.
- **Bounce** - a spring that overshoots and settles.
- **Perceptual duration** - how long it *feels* finished while still settling.
- **Momentum**, **velocity** - carried speed, and its direction; a spring carries
  velocity into the next animation when interrupted.
- **Interruptible animation** - redirectable mid-flight rather than finishing
  first.

## Looping and ambient motion

- **Marquee**, **loop**, **alternate (yoyo)**, **orbit**, **pulse**, **float**,
  **idle animation** - the repeating and ambient forms, and the difference
  between a loop that restarts and one that reverses.

## Polish and effects

- **Blur** - softening an element or masking a seam.
- **Clip-path**, **mask** - clipping to a shape, and hiding or revealing with
  soft, fadeable edges.
- **Before / after slider** - a draggable divider between two overlaid images.
- **Line drawing** - an SVG path that draws itself.
- **Text morph**, **typewriter** - text changing character by character.
- **Skeleton / shimmer** - a placeholder with a moving sheen while content loads.
- **Number ticker**, **tabular numbers** - digits rolling to a value, and the
  fixed-width digits that stop a changing number from shifting.

## Performance

- **Frame rate (FPS)**, **jank**, **dropped frame** - the visible cost of missing
  a frame's deadline.
- **Compositing**, **will-change**, **hardware acceleration** - letting the
  compositor move or fade an element without redoing layout or paint.
- **Layout thrashing** - animating a property that forces layout every frame.

## Principles to know

- **Purposeful animation** - motion serves a function rather than decorating.
- **Anticipation**, **follow-through**, **squash and stretch** - the weight and
  continuity cues borrowed from animation craft.
- **Perceived performance** - the right motion makes an interface feel faster.
- **Frequency of use** - the more often an animation is seen, the shorter and
  subtler it should be.
- **Spatial consistency** - an element keeps its identity and position across
  states.
- **Reduced motion** - honouring the preference by toning motion down or removing
  it.
