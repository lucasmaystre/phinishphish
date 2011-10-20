################################################################################
#                                                                              #
# This makefile will compile your LaTeX report (including building the bib     #
# file). Edit the PAPER variable below to fit the name of your LaTeX document. #
# Note that you should *not* include the .tex extension.  Thus, if your report #
# file is thing.tex, set PAPER equal to thing, not thing.tex.                  #
#                                                                              #
# If your paper uses postscript figures, type "make ps" at the command line.   #
# If your paper uses PDF figures, type "make pdf" at the command line.         #
# To delete all the extra files that LaTeX creates, type "make clean"          #
#                                                                              #
################################################################################

PAPER = paper

################################################################################
#                                                                              #
# The following definitions should be correct for most systems. Change them if #
# you must, but it is probably better in the long run to get your system into  #
# a more standardized state.                                                   #
#                                                                              #
################################################################################

LATEX    = latex
PDFLATEX = pdflatex
BIBTEX   = bibtex
DVIPS    = dvips -o $(PAPER).ps -t letter
PS2PDF   = ps2pdf
VER      = 1.1.0
TARGDIR  = uereport_$(VER)

################################################################################
# This is the default behavior if you just type "make".  It should be pdf if   #
# are using pdf files for your figures.  If you are using postscript figures,  #
# you need to change this to ps (or always type "make ps").                    #
################################################################################

all:	pdf




################################################################################
#                                                                              #
# This is the machienery for building the completed report. No user servicable #
# parts below....                                                              #
#                                                                              #
################################################################################


################################################################################
# Use "make ps" to create a postscript version of your report.  To use this    #
# option, you need to have either a .eps or .ps version of each of your figs   #
# in the figure directory (LaTeX won't take .pdf files in this call).  We also #
# convert the ps file to a PDF file just in case...                            #
################################################################################

ps:
	$(LATEX)  $(PAPER)
	$(BIBTEX) $(PAPER)
	$(LATEX)  $(PAPER)
	$(LATEX)  $(PAPER)
	$(DVIPS)  $(PAPER)
	$(PS2PDF) $(PAPER).ps

################################################################################
# Use "make pdf" to create a PDF version of your report.  To use this option,  #
# you must have a .pdf or .jpg version of each of your figures in the figure   #
# directory (LaTeX won't take .eps or .ps files in this call).                 #
################################################################################

pdf:
	$(PDFLATEX) $(PAPER)
	$(BIBTEX)   $(PAPER)
	$(PDFLATEX) $(PAPER)
	$(PDFLATEX) $(PAPER)

################################################################################
# This cleans up the current directory                                         #
################################################################################

clean:
	/bin/rm -f *.log	# remove log files
	/bin/rm -f *.aux	# remove auxillary files
	/bin/rm -f *.dvi	# remove .dvi files
	/bin/rm -f *.bak	# remove spell check backup files
	/bin/rm -f *.toc	# remove the .toc file
	/bin/rm -f *.bbl *.blg	# auxillary BibTeX files
	/bin/rm -f *.lot *.lof	# remove list of tables and list of figures
	/bin/rm -f paper.pdf
	/bin/rm -f paper.ps


package:	clean
		/bin/rm -Rf uereport*
		/bin/mkdir          $(TARGDIR)
		/bin/cp Makefile    $(TARGDIR)
		/bin/cp LICENSE     $(TARGDIR)
		/bin/cp paper*      $(TARGDIR)
		/bin/cp -R styles   $(TARGDIR)
		/bin/cp -R figures  $(TARGDIR)
		tar -cf $(TARGDIR).tar $(TARGDIR)/*
		gzip $(TARGDIR).tar
		/bin/rm -Rf $(TARGDIR)
	
	

