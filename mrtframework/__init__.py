__version__ = '0.2.1'
import logging
logger = logging.getLogger(__name__)

from .master_reading_tree import MasterReadingTree
from .retrieving import retrieve
from .reading import read
from .roadmapping import roadmap
from .reasoning import reason