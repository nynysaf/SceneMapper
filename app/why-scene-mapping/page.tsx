'use client';

import Link from 'next/link';
import Image from 'next/image';

/**
 * "Why scene mapping?" — Long-form article on scene consciousness and collective mapping.
 * Content from scene_consciousness_blog.md.
 */
export default function WhySceneMappingPage() {
  return (
    <div className="min-h-screen bg-[#fdfcf0] text-emerald-950">
      <header className="border-b border-emerald-100 bg-white/70 backdrop-blur px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-emerald-800 hover:text-emerald-700">
          ← Back to Scene Mapper
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-12">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-950 leading-tight mb-4">
            When Scenes See Themselves: Mapping the Collective Consciousness of Culture
          </h1>
        </header>

        <figure className="rounded-2xl overflow-hidden border border-emerald-100 shadow-md">
          <Image
            src="/images/01_uncanny_recognition.png"
            alt="A stylized illustration showing someone at a workshop, surrounded by familiar faces in speech bubbles or thought clouds — the same faces appearing at different events: a dinner party, a systems thinking meetup, a dance floor. Comic-style panels showing recognition dawning."
            width={800}
            height={450}
            className="w-full h-auto object-cover"
          />
        </figure>

        <section className="space-y-4 text-emerald-800 leading-relaxed">
          <p>
            You&apos;re at a somatics workshop on a Wednesday night. Across the room, you spot
            someone from that systems thinking meetup last month. The facilitator? They were at
            the regenerative economics dinner. And wait — isn&apos;t that the person who hosted
            the collaboration session inspired by mycelium networks?
          </p>
          <p>
            For a moment, you wonder if you&apos;re imagining patterns that aren&apos;t there. But
            then it keeps happening. Different venues, different topics, same faces. You start to
            notice shared language appearing in disparate places — people using similar metaphors,
            similar ways of being together. It&apos;s like watching constellation patterns emerge
            in the night sky.
          </p>
          <p>You&apos;re not imagining it. You&apos;ve stumbled into something alive.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-950 mb-4">What Makes a Scene?</h2>
          <div className="space-y-4 text-emerald-800 leading-relaxed">
            <p>
              This isn&apos;t just a network. Networks have formal relationships — LinkedIn
              connections, organizational charts, trade associations. This isn&apos;t just a
              community either. Communities tend to have clearer centers, more defined boundaries
              around shared identities or practices.
            </p>
            <p>
              A scene is something more fluid and more coherent at the same time. It&apos;s what
              happens when culture becomes visible enough to recognize but distributed enough that
              no one owns it. It&apos;s the ska scene in Montreal in the 2000s. It&apos;s the rise
              of Silicon Valley as a tech hub. It&apos;s what&apos;s emerging in Toronto right now
              around people who care about growth, healing, and systems change.
            </p>
            <p>Signs you&apos;re in a scene:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You keep bumping into the same people at wildly different events</li>
              <li>Similar vibes and language appear across different spaces</li>
              <li>It&apos;s not centered in any one place — it&apos;s held by many</li>
              <li>
                People can tell who&apos;s in it and who isn&apos;t, even without explicit
                membership
              </li>
            </ul>
            <p>
              A scene has an <strong>attractor</strong> — something that pulls elements together,
              even if it&apos;s never been formally named. This is different from a boundary that
              defines who&apos;s in or out. Instead, people resonate with the attractor at
              different intensities. Some are at the core, some orbit the edges, some drift
              between multiple scenes.
            </p>
          </div>
          <figure className="mt-6 rounded-2xl overflow-hidden border border-emerald-100 shadow-md">
            <Image
              src="/images/02_constellation_formation.png"
              alt="A constellation map where dots (people) gradually form a recognizable pattern, like stars forming a constellation. Show progression from scattered dots to connected network to coherent shape."
              width={800}
              height={450}
              className="w-full h-auto object-cover"
            />
          </figure>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-950 mb-4">The Magic of Seeing</h2>
          <div className="space-y-4 text-emerald-800 leading-relaxed">
            <p>
              Here&apos;s where it gets interesting. In Toronto, my collaborator Meghan Hellstern
              and I released a social systems map into what we felt to be an emerging scene. We
              expected to find distinct subgroups — event creators in one cluster, tech innovators
              in another, healing practitioners over here. What we found surprised everyone who
              joined.
            </p>
            <p>
              Over 200 people mapped themselves, revealing their connections, interests, and
              dreams for this network. When we visualized it, the automatic community detection
              algorithm found just <strong>one</strong> community, not the 20+ we&apos;d seeded.
              People were shocked to see how many folks they knew from completely different
              contexts, all woven into the same web.
            </p>
            <p>Something shifted when people could see the whole. Questions became possible that couldn&apos;t be asked before:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>&quot;Who are we?&quot;</li>
              <li>&quot;What do we want?&quot;</li>
              <li>&quot;What is ours to do?&quot;</li>
              <li>&quot;How are we learning and evolving?&quot;</li>
              <li>&quot;What are our blindspots?&quot;</li>
            </ul>
            <p>
              Consciousness requires three things: awareness of self, awareness of environment,
              and awareness of the relationship between them. When a scene can see itself — when
              the parts can see each other and the whole — a quality of collective consciousness
              emerges. The parts start caring for the whole. The whole starts caring for the
              parts.
            </p>
            <p>
              In Internal Family Systems therapy, just having one Part that is conscious —
              aware of the whole system and its context — can be enough to create a quality of
              consciousness for the entire person. The same pattern holds for scenes. If even a
              small web of individuals can see and describe the scene, they can act to support
              emergent qualities of consciousness in the larger system.
            </p>
            <p>
              To someone unconscious of the larger pattern, it feels like magic: &quot;This place
              just has so many coincidences that benefit me.&quot; To someone who sees the system,
              it&apos;s visible: the nudges, the connections, the conditions that make those
              coincidences probable.
            </p>
          </div>
          <figure className="mt-6 rounded-2xl overflow-hidden border border-emerald-100 shadow-md">
            <Image
              src="/images/03_expanding_awareness.png"
              alt="A split image showing the same scene map. On the left: someone's limited view — just their immediate connections. On the right: zooming out to reveal the entire interconnected web, with their position in context. Maybe use a fractal-like visual to suggest layers of awareness."
              width={800}
              height={450}
              className="w-full h-auto object-cover"
            />
          </figure>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-950 mb-4">
            The Developmental Journey of Scenes
          </h2>
          <p className="text-emerald-800 leading-relaxed mb-6">
            Not all scenes are created equal. Like individuals moving through stages of ego
            development, scenes grow in their capacity for collective consciousness and
            intentionality. To make up a fake framework:
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">
                Stage 1: The Emerging Scene
              </h3>
              <p className="text-emerald-800 leading-relaxed mb-2 italic">
                At this stage, people are starting to notice patterns. &quot;Wait, something&apos;s
                happening here...&quot;
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Individual events occur. People attend things they&apos;re interested in.
                Occasionally someone says, &quot;Hey, weren&apos;t you at that thing last
                week?&quot; But there&apos;s no perception of a larger pattern yet. It&apos;s like
                a cloud or a crowd — low coherence, no sense of &quot;we,&quot; no collective
                awareness or intentionality.
              </p>
              <p className="text-emerald-800 leading-relaxed mt-2">
                This is the atomistic stage. Each person pursues their individual interests. The
                scene exists objectively — you could draw the connections on paper — but it
                doesn&apos;t exist subjectively. No one has named it yet.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">
                Stage 2: The Conscious Scene
              </h3>
              <p className="text-emerald-800 leading-relaxed mb-2">
                This is where things get interesting. The scene becomes visible to itself.
              </p>
              <p className="text-emerald-800 leading-relaxed mb-2">
                Event creators start attending each other&apos;s events. Shared language and
                concepts begin circulating. People can name the vibe: &quot;This feels like a{' '}
                <em>[scene name]</em> thing.&quot; The scene becomes mappable — people can
                visualize the whole, even if imperfectly.
              </p>
              <p className="text-emerald-800 leading-relaxed mb-2">
                <strong>Here&apos;s a key developmental marker:</strong> event curators emerge.
                Not just hosts creating individual events, but people who aggregate and make sense{' '}
                <em>across</em> events. They&apos;re operating at a layer of complexity higher than
                individual event creation. They see patterns. They connect dots. They help others
                discover related happenings.
              </p>
              <p className="text-emerald-800 leading-relaxed mb-2">
                The scene develops a sense of itself — collectively making sense of what&apos;s
                going on around it. It can respond to its environment. Collective questions become
                possible. There&apos;s intentionality, not just momentum.
              </p>
              <p className="text-emerald-800 leading-relaxed mb-2">
                &quot;We are the people who care about growth, healing, and systems change in
                Toronto&quot; — this kind of statement becomes sayable. The scene has a collective
                identity, even if loosely held.
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Research on collective intelligence suggests that groups that develop real shared
                intelligence tend to have certain qualities in common: high social perceptiveness
                (people who can read subtle cues about what others are feeling), equal
                conversational turn-taking (not dominated by a few voices), and cognitive
                diversity (different ways of thinking and knowing). A conscious scene embodies
                these qualities not just in individual gatherings, but across its whole network.
                Information flows. Different perspectives are valued. There&apos;s space for
                novelty.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">
                Stage 3: The Generative Scene
              </h3>
              <p className="text-emerald-800 leading-relaxed mb-2">
                This is where scenius — Brian Eno&apos;s term for the collective genius of scenes
                — fully emerges.
              </p>
              <p className="text-emerald-800 leading-relaxed mb-2">
                The scene becomes capable of something profound: it can generate new scenes. Not
                just new events, but new event-generators. Not just community, but the conditions
                for community. It develops what we might call &quot;sensing organs&quot; — regular
                practices for collective awareness like mapping parties, reflection gatherings,
                and cross-pollination rituals.
              </p>
              <p className="text-emerald-800 leading-relaxed mb-2">
                The scene can hold developmental perspective on itself. It understands its own
                growth. It relates consciously to other scenes, creating channels for learning
                and mutual support. Care flows both ways — parts nurture the whole, and the whole
                nurtures the parts.
              </p>
              <p className="text-emerald-800 leading-relaxed mb-2">
                As Keith Sawyer writes in <em>Group Genius</em>, when groups achieve flow
                together, they blend egos while maintaining individual skill. There&apos;s a
                paradox: you must be highly competent AND willing to subordinate yourself to the
                collective intelligence. The scene becomes greater than the sum of its parts.
              </p>
              <p className="text-emerald-800 leading-relaxed mb-2">
                Donella Meadows, in her work on leverage points in systems, noted that the
                highest-leverage interventions are those that shift paradigms — or transcend them
                entirely. A generative scene operates at this level. It&apos;s not just doing
                things differently, it&apos;s changing what&apos;s possible to imagine.
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Here, multiple attractors can be held simultaneously without fragmentation. The
                Toronto scene interested in growth might spawn a sub-scene focused on embodiment
                practices, another on collaborative governance, another on metamodern art. These
                remain connected to the parent scene while developing their own coherence. The
                scene becomes fractal — consciousness at every scale.
              </p>
            </div>
          </div>

          <figure className="mt-6 rounded-2xl overflow-hidden border border-emerald-100 shadow-md">
            <Image
              src="/images/04_developmental_stages.png"
              alt="An organic visual metaphor showing developmental stages — perhaps a seed to sprout to young plant to mature ecosystem. Each stage labeled with scene characteristics: scattered events, recurring faces and emerging language, event curators and mapping parties and collective questions, scene birthing scenes."
              width={800}
              height={450}
              className="w-full h-auto object-cover"
            />
          </figure>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-950 mb-4">What Kills Scenius?</h2>
          <p className="text-emerald-800 leading-relaxed mb-4">
            Before we talk about how to nurture scenes, let&apos;s be honest about what suffocates
            them:
          </p>
          <ul className="space-y-4 text-emerald-800 leading-relaxed">
            <li>
              <strong>Premature institutionalization.</strong> Trying to capture and control the
              scene before it&apos;s ready. The moment someone says &quot;we should make this
              official&quot; with bylaws and membership criteria, something precious often dies.
              Structure is needed eventually, but timing matters enormously.
            </li>
            <li>
              <strong>Status hierarchies calcifying.</strong> When the scene becomes about
              who&apos;s &quot;in&quot; rather than what&apos;s emerging. When early participants
              gate-keep rather than welcome. When influence becomes currency to hoard rather than
              energy to circulate.
            </li>
            <li>
              <strong>Loss of porosity.</strong> When boundaries become walls. When people stop
              bringing friends from other contexts. When &quot;you had to be there from the
              beginning&quot; becomes the vibe.
            </li>
            <li>
              <strong>Extraction without reciprocity.</strong> People mining the scene for
              personal gain — contacts, opportunities, content — without giving back. This
              creates a vacuum, depleting rather than generative.
            </li>
            <li>
              <strong>Homogenization.</strong> When cognitive diversity collapses into conformity.
              When there&apos;s a &quot;right way&quot; to think or be. When novelty becomes
              threatening rather than exciting.
            </li>
          </ul>
          <p className="text-emerald-800 leading-relaxed mt-4">
            As Nora Bateson writes about symmathesy — mutual learning in living systems — health
            requires diversity in relationship. When contexts collapse into uniformity, learning
            stops. The scene becomes stagnant.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-950 mb-4">Conditions for Scenius</h2>
          <p className="text-emerald-800 leading-relaxed mb-4">
            So what creates the conditions for scenes to flourish and evolve? Drawing from
            research and observation:
          </p>
          <ul className="space-y-4 text-emerald-800 leading-relaxed">
            <li>
              <strong>Rapid exchange of ideas.</strong> Brian Eno emphasized this in his original
              articulation of scenius. Ideas must circulate quickly. This isn&apos;t just
              information transfer — it&apos;s inspiration cascading. You attend an event, get
              sparked, create your own version, which sparks someone else. Velocity matters.
            </li>
            <li>
              <strong>Mutual appreciation.</strong> &quot;Scenius is like genius,&quot; Eno wrote,
              &quot;only embedded in a scene rather than in genes.&quot; People genuinely
              celebrating each other&apos;s work. Stealing from each other generously. Building
              on each other&apos;s experiments without territorialism.
            </li>
            <li>
              <strong>Tolerance for novelty.</strong> Willingness to try weird things.
              Psychological safety to fail publicly. Spaces where half-baked ideas are welcomed.
              As Keith Sawyer notes in his research on group flow, operating at the edge of
              abilities — where failure is possible — is essential for breakthrough.
            </li>
            <li>
              <strong>Blending egos.</strong> Another insight from Sawyer: individuals must be
              skilled AND willing to subordinate themselves to collective emergence. It&apos;s not
              about ego death, but ego dance. Knowing when to lead, when to follow, when to get
              out of the way.
            </li>
            <li>
              <strong>Familiarity breeding improvisation.</strong> When people know each
              other&apos;s styles and rhythms, they can &quot;yes-and&quot; more fluidly. Like
              jazz musicians who&apos;ve played together for years, there&apos;s an attunement
              that enables collective improvisation.
            </li>
            <li>
              <strong>Equal participation.</strong> This shows up in both Woolley&apos;s research
              on collective intelligence and Sawyer&apos;s on group flow. Domination by a few
              voices diminishes the whole. This doesn&apos;t mean everyone speaks the same amount,
              but that everyone&apos;s contribution matters and is invited.
            </li>
            <li>
              <strong>Network effects of cooperation.</strong> When helping others becomes the
              norm, when collaboration compounds. Otto Scharmer calls this &quot;presencing&quot;
              — the capacity of a system to sense and actualize its highest future potential.
              Scenes that cultivate this quality become generative engines.
            </li>
          </ul>
          <figure className="mt-6 rounded-2xl overflow-hidden border border-emerald-100 shadow-md">
            <Image
              src="/images/05_scenius_flows.png"
              alt="A vibrant network visualization showing the flows and products of a generative scene — ideas circulating as glowing paths, collaborations forming as nodes connecting, new possibilities emerging as branching light. Incorporate visual elements suggesting movement and flow."
              width={800}
              height={450}
              className="w-full h-auto object-cover"
            />
          </figure>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-950 mb-4">The Practice of Mapping</h2>
          <div className="space-y-4 text-emerald-800 leading-relaxed">
            <p>So how do we support scene consciousness? How do we help scenes see themselves?</p>
            <p>
              At <Link href="https://scenemapper.ca" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:text-emerald-600 underline">SceneMapper.ca</Link>, we&apos;ve been experimenting with participatory mapping. We map events,
              people, spaces, communities, meta-communities, and the connections between them.
              But the tool itself is less important than the practice.
            </p>
            <p>
              <strong>Mapping parties</strong> bring together diverse people from across a scene.
              We invite them to map themselves — their connections, their interests, their dreams
              and questions for the network. The conversation that happens while people add
              themselves to the map is as valuable as the map itself. People discover surprising
              connections. They articulate patterns they&apos;d felt but never named. They start
              to see their role in a larger ecology.
            </p>
            <p>
              The map becomes a mirror. Not a perfect reflection — all maps are partial, all
              models are wrong — but useful. It makes the invisible visible enough to discuss, to
              wonder about, to act on.
            </p>
            <p>
              As Dave Snowden teaches in his work on complexity and sense-making, we can&apos;t
              manage complex systems, but we can sense them and create conditions for desired
              patterns to emerge. Mapping is a sensing practice. It reveals where the energy is
              flowing, where bridges might be built, where gaps exist.
            </p>
            <p>
              When we held our first mapping party for the Toronto scene, over 80 people showed
              up. The room buzzed with the particular quality of recognition — &quot;Oh,
              you&apos;re the person who...&quot; and &quot;I had no idea you were connected
              to...&quot; The map itself showed one highly interconnected web. But more important
              was what happened next: people started asking questions about the scene&apos;s
              future. They started proposing new collaborations. They started thinking as
              &quot;we.&quot;
            </p>
            <p>One conscious part awakening others.</p>
          </div>
          <figure className="mt-6 rounded-2xl overflow-hidden border border-emerald-100 shadow-md">
            <Image
              src="/images/06_scene_map_interface.png"
              alt="A scene map from SceneMapper.ca showing the web of connections — events (different colored nodes), people (dots), spaces (landmarks), with relationship lines between them. Include both a zoomed-out full view and a zoomed-in detail showing the richness of local connections. Make it feel inviting, not overwhelming."
              width={800}
              height={450}
              className="w-full h-auto object-cover"
            />
          </figure>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-950 mb-4">An Improvisational Future</h2>
          <div className="space-y-4 text-emerald-800 leading-relaxed">
            <p>
              Let me get a little hand-wavy for a moment. I want to imagine something specific
              about what becomes possible.
            </p>
            <p>
              I imagine Toronto becoming a place of world-class facilitation. Not in a
              credentialing or professionalization sense, but in an embodied cultural sense.
              Where the frequency of &quot;home run&quot; events — the kind where both hosts and
              guests say &quot;that was way better than I imagined&quot; — doubles, then doubles
              again.
            </p>
            <p>
              I imagine an improvisational scene. Not literally improv comedy (though Toronto has
              great improv scenes too), but a culture where hosts attend each other&apos;s events,
              draw inspiration, build on each other&apos;s innovations &quot;yes-and&quot; style.
              The way impressionist painters in Paris sparked each other into new expressions. The
              way Nashville has a sound that just <em>hits different</em>.
            </p>
            <p>
              In this imagined future, my son — who&apos;s arriving this spring — grows up
              assuming that any random group of neighbours could work and play together
              effectively. That difference makes groups stronger rather than weaker. That there
              are practices for discovering shared values across different ages, economics,
              identities, and backgrounds.
            </p>
            <p>
              Right now, that&apos;s not my assumption about random Torontonians. We live in
              tremendous diversity but without the capacity to really integrate our differences.
              We fracture into parts. One government installs bike lanes, another removes them.
              We lose opportunities to support each other with our unique gifts.
            </p>
            <p>
              But within our city, there are spaces where people gather through shared interests
              and learn to listen to each other deeply. To hold ego lightly. To be co-creators
              rather than consumers. To care for &quot;we&quot; as well as &quot;me.&quot;
            </p>
            <p>
              This vibe seems to be part of the golden thread connecting the scene I see. The
              topic almost doesn&apos;t matter — whether it&apos;s somatics or economics or
              philosophy or dance. What matters is the quality of attunement that facilitators
              bring, the container they create for something more than transactions.
            </p>
            <p>
              Great facilitation opens new worlds of possibility. Events where each
              participant&apos;s presence matters. Well-designed gatherings that invite us to be
              the people we want to be, doing more than we imagined possible.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-950 mb-4">Your Turn</h2>
          <div className="space-y-4 text-emerald-800 leading-relaxed">
            <p>
              If you&apos;re reading this, you&apos;re probably already embedded in at least one
              scene, whether you&apos;ve named it or not. Maybe you&apos;re the person who keeps
              showing up at different gatherings and noticing the same faces. Maybe you&apos;re
              hosting events and wondering how they connect to the larger ecosystem. Maybe
              you&apos;re just curious why certain spaces feel different — more alive, more
              meaningful.
            </p>
            <p>
              Consider this your invitation to look for the patterns. Who do you keep encountering
              across different contexts? What&apos;s the attractor that&apos;s pulling you all
              together, even if it&apos;s never been articulated? What shared language or ways of
              being have you noticed emerging?
            </p>
            <p>And then consider: what would it take to help your scene see itself?</p>
            <p>
              You don&apos;t need sophisticated tools or formal structures. Start with
              conversation. Host a gathering where the explicit purpose is to map the network.
              Create a simple form asking people to name the events they attend, the people
              they&apos;re connected to, the communities they&apos;re part of, what they dream
              about for the collective.
            </p>
            <p>
              The practice of mapping itself is developmental. As people articulate their place
              in the web, as they see the larger pattern, something shifts. Questions become
              possible. Intentionality emerges. Care starts flowing in new directions.
            </p>
            <p>
              You might discover, as we did in Toronto, that what felt like separate communities
              is actually one highly interconnected scene waiting to recognize itself. Or you
              might clarify important distinctions — this <em>is</em> separate from that, and
              that&apos;s okay. Either way, you&apos;ll know something you didn&apos;t before.
            </p>
            <p>
              The world needs more conscious scenes. Not because scenes are inherently good —
              they can be insular, conformist, extractive if they develop poorly. But because the
              challenges we face require new forms of collective intelligence. We need to get
              better at working across differences, at generating novelty while maintaining
              coherence, at caring for wholes while honoring parts.
            </p>
            <p>
              Scenes that can see themselves have a fighting chance at becoming scenes that can
              evolve themselves. And scenes that can evolve themselves might just be the cultural
              containers we need for the transition ahead.
            </p>
            <p>
              As Nora Bateson writes, <em>&quot;The pattern which connects is a metapattern. It is a pattern of patterns.&quot;</em>{' '}
              When scenes map themselves, they&apos;re not just documenting what is. They&apos;re
              participating in the pattern which connects. They&apos;re making evolution visible
              and therefore more possible.
            </p>
            <p>So look around at your next event. Notice who&apos;s there. Ask someone how they found out about it. Start connecting dots. Begin the conversation.</p>
            <p className="text-lg font-semibold text-emerald-900">Your scene is waiting to see itself.</p>
          </div>
          <figure className="mt-6 rounded-2xl overflow-hidden border border-emerald-100 shadow-md">
            <Image
              src="/images/07_fractal_interconnection.png"
              alt="A final expansive image showing multiple scenes interconnecting — like a fractal network or ecosystem view. Zoom out from a single scene map to reveal it's part of a larger web of scenes, each with their own patterns and connections. The feeling should be inspiring and generative — not overwhelming but full of possibility."
              width={800}
              height={450}
              className="w-full h-auto object-cover"
            />
          </figure>
        </section>

        <section className="glass rounded-2xl p-6 border border-emerald-100">
          <h3 className="text-lg font-bold text-emerald-950 mb-3">Want to explore this further?</h3>
          <p className="text-emerald-800 leading-relaxed mb-4">
            If you&apos;re working on scene-mapping, collective intelligence, or cultural
            evolution, I&apos;d love to hear from you. Reach out on{' '}
            <a
              href="https://www.linkedin.com/in/naryanwong/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-700 hover:text-emerald-600 underline"
            >
              LinkedIn
            </a>{' '}
            or{' '}
            <a
              href="https://twitter.com/hinaryan"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-700 hover:text-emerald-600 underline"
            >
              Twitter
            </a>
            .
          </p>
          <p className="text-emerald-800 leading-relaxed">
            And if you&apos;re in Toronto and this resonates, come to one of the events in our
            emerging scene. Check out the interactive map at{' '}
            <Link href="https://scenemapper.ca" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:text-emerald-600 underline">
              SceneMapper.ca
            </Link>{' '}
            or browse{' '}
            <a
              href="https://chrisdcalendars.notion.site/chrisdcalendars/Toronto-Event-Calendar-a6a970ba10aa461fa3846a9c996ecf49"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-700 hover:text-emerald-600 underline"
            >
              upcoming gatherings
            </a>
            .
          </p>
          <p className="text-emerald-800 leading-relaxed mt-4 italic">
            The map is always growing. The scene is always evolving. Your presence matters.
          </p>
        </section>
      </main>
    </div>
  );
}
