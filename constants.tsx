
import { MapNode, NodeType } from './types';

export const INITIAL_NODES: MapNode[] = [
  {
    id: '1',
    type: NodeType.COMMUNITY,
    title: 'Kensington Solarpunk Guild',
    description: 'The Kensington Solarpunk Guild represents the beating heart of Toronto’s localized ecological transition. Situated just a stone’s throw from Bellevue Square Park, this collective has transformed the historic neighborhood into a living laboratory of permaculture and decentralized technology. Here, the traditional brick facades are now draped in vertical hydroponic arrays, growing everything from rare heirloom tomatoes to medicinal herbs used in the Guild’s free community apothecary. \n\nMembers of the Guild are famous for their "tinker-clinics," where they repair antiquated electronics using modular, open-source parts. They also maintain a network of atmospheric water generators that provide clean, mineral-rich drinking water to the entire block during the humid summer months. The Guild operates on a gift-economy basis, ensuring that no neighbor goes without the tools or nutrients required to maintain their own urban plot. Visitors are often greeted by the hum of small, bird-friendly wind turbines perched atop the Victorian rooftops, signaling a community that has successfully reconciled its historic character with a high-tech, carbon-negative future. This is more than just a garden; it is a fortress of resilience and a blueprint for the neighborhood-scale autonomy that Torontopia thrives upon.',
    x: 42,
    y: 58,
    tags: ['gardening', 'tech', 'local'],
    primaryTag: 'gardening',
    collaboratorId: 'system',
    status: 'approved'
  },
  {
    id: '2',
    type: NodeType.SPACE,
    title: 'The Great Hall (Reimagined)',
    description: 'The Reimagined Great Hall stands as a towering testament to the adaptive reuse movement of the late 21st century. Once a traditional event space, it has been retrofitted with "Living Glass"—a revolutionary translucent solar material that mimics the photosynthetic capabilities of real foliage. This allows the building to generate 150% of its own power needs, feeding the surplus back into the West Queen West micro-grid. \n\nInside, the acoustic properties have been perfected through the use of mycelium-based soundproofing, creating a warm, organic resonance that makes it the premier venue for acoustic performances and public discourse. The Great Hall serves as the regional parliament for the West-End Commons, hosting weekly assemblies where citizens use holographic voting interfaces to direct the distribution of local resources. Its rooftop terrace features a massive "Pollinator Cathedral," a sanctuary for urban bees and butterflies that provides essential ecosystem services to the surrounding rooftops. By day, the hall functions as a co-working sanctuary for artists and bio-engineers; by night, it transforms into a bioluminescent garden of sound and light. It remains the most significant cultural anchor in Torontopia, proving that we do not need to tear down our past to build a sustainable future.',
    x: 35,
    y: 65,
    tags: ['historic', 'energy', 'gathering'],
    primaryTag: 'historic',
    collaboratorId: 'system',
    status: 'approved'
  },
  {
    id: '4',
    type: NodeType.PERSON,
    title: 'Luna Sky',
    description: 'Luna Sky is the lead architect of the Waterfront Kelp Filtration Project and a central figure in the restoration of Lake Ontario’s coastline. A native of the Toronto Islands, Luna spent her youth witnessing the transition from industrial runoff to crystal-clear waters. She holds a double doctorate in Bio-Mimetic Engineering and Aquatic Ecology, but she prefers to be known simply as a "Warden of the Deep." \n\nLuna’s work involves the deployment of massive, AI-monitored kelp forests that act as natural carbon sinks and water purifiers. These forests have successfully removed decades of microplastics and heavy metals from the harbor, allowing for the return of long-absent fish species. Luna is often found in her floating laboratory—a sleek, solar-powered catamaran—conducting workshops on how to harvest kelp for biodegradable packaging materials. She is a tireless advocate for "Blue Citizenship," a philosophy that treats the lake as a legal person with rights to health and longevity. Her leadership has not only cleaned the water but has inspired a new generation of Torontonians to view the waterfront not as a boundary, but as a vital, living partner in the city’s survival.',
    x: 60,
    y: 80,
    tags: ['engineer', 'water', 'expert'],
    primaryTag: 'engineer',
    collaboratorId: 'system',
    status: 'approved'
  }
];

export const CATEGORY_COLORS: Record<NodeType, string> = {
  [NodeType.EVENT]: '#E67E22', // Terra Cotta
  [NodeType.PERSON]: '#F1C40F', // Sun Gold
  [NodeType.SPACE]: '#8BA888', // Sage Green
  [NodeType.COMMUNITY]: '#3498DB', // Sky Blue
  [NodeType.REGION]: '#4a5568', // Slate (text only, no dot)
};
